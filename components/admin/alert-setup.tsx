"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Volume2, VolumeX, Smartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  disablePush,
  enablePush,
  getPushState,
  sendTestPush,
  type PushState,
} from "@/lib/push/client";

/**
 * "Order alerts on this device", at the top of the Orders page.
 *
 * Every phone needs a little setting up before it can alert staff, and
 * nothing used to say so — the alarm simply stayed silent on the client's
 * phone in the demo (2026-10-27). This shows what is on, what is off, and the
 * one tap that fixes each:
 *  - Sound: phones only allow sound after a tap on the page.
 *  - Notifications: push, so a locked phone still buzzes (lib/push).
 *  - Keep screen on: for a phone or tablet left on the counter.
 *  - Test: rings this device exactly as an order would.
 */
export function AlertSetup({
  soundReady,
  unlockSound,
  testAlarm,
}: {
  soundReady: boolean;
  unlockSound: () => Promise<boolean>;
  testAlarm: () => Promise<void>;
}) {
  const [push, setPush] = useState<PushState | "checking">("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const wake = useWakeLock();

  useEffect(() => {
    let live = true;
    void getPushState().then((s) => {
      if (live) setPush(s);
    });
    return () => {
      live = false;
    };
  }, []);

  const turnOnNotifications = async () => {
    setBusy(true);
    setMessage(null);
    await unlockSound();
    const result = await enablePush();
    setPush(result.state);
    if (result.error) setMessage(result.error);
    else if (result.state === "on") setMessage("Notifications are on for this device. Press Test to check.");
    setBusy(false);
  };

  const turnOff = async () => {
    setBusy(true);
    setPush(await disablePush());
    setMessage("Notifications are off for this device.");
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMessage(null);
    await testAlarm();
    if (push === "on") {
      const sent = await sendTestPush();
      setMessage(
        sent > 0
          ? "Test sent. In a few seconds a notification should arrive — lock the phone to check it buzzes."
          : "The test notification couldn't be sent to this device. Turn notifications off and on again."
      );
    } else {
      setMessage("You should hear beeping now. Turn on notifications too, so a locked phone still alerts.");
    }
    setBusy(false);
  };

  const allSet = soundReady && push === "on";

  return (
    <div className="mb-6 rounded-2xl border border-ink/10 bg-white px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">
          Order alerts on this device{allSet ? " ✓" : ""}
        </p>
        <Button size="sm" variant="outline" onClick={() => void test()} disabled={busy}>
          <Bell size={14} /> Test alert
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* Sound */}
        {soundReady ? (
          <Pill on icon={<Volume2 size={14} />}>Sound on</Pill>
        ) : (
          <Button size="sm" variant="primary" onClick={() => void unlockSound()}>
            <VolumeX size={14} /> Tap to turn on sound
          </Button>
        )}

        {/* Notifications */}
        {push === "on" && (
          <>
            <Pill on icon={<Bell size={14} />}>Notifications on</Pill>
            <button type="button" onClick={() => void turnOff()} disabled={busy} className="text-xs text-ink-faint underline">
              turn off
            </button>
          </>
        )}
        {push === "off" && (
          <Button size="sm" variant="primary" onClick={() => void turnOnNotifications()} disabled={busy}>
            <Bell size={14} /> Turn on notifications
          </Button>
        )}

        {/* Keep screen on */}
        {wake.supported && (
          <Button size="sm" variant={wake.on ? "outline" : "ghost"} onClick={() => void wake.toggle()}>
            <Sun size={14} /> {wake.on ? "Screen stays on ✓" : "Keep screen on"}
          </Button>
        )}
      </div>

      {push === "blocked" && (
        <Note icon={<BellOff size={14} />}>
          Notifications are blocked for this site. Open the browser&rsquo;s settings for
          savorbydee.in, allow Notifications, then come back and reload.
        </Note>
      )}
      {push === "needs-home-screen" && (
        <Note icon={<Smartphone size={14} />}>
          On iPhone, notifications only work from the Home Screen: tap <b>Share</b> →{" "}
          <b>Add to Home Screen</b>, open <b>Savor Staff</b> from there, sign in, and turn
          notifications on.
        </Note>
      )}
      {push === "unsupported" && (
        <Note icon={<BellOff size={14} />}>
          This browser can&rsquo;t alert you when the screen is off. On Android use Chrome; on
          iPhone add the site to the Home Screen.
        </Note>
      )}
      {message && <p className="mt-2 text-xs text-ink-soft">{message}</p>}
    </div>
  );
}

function Pill({ on, icon, children }: { on: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        on ? "bg-mint-soft text-ink" : "bg-ink/5 text-ink-soft"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}

function Note({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-xl bg-yellow-soft px-3 py-2 text-xs leading-relaxed text-ink">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

/** Screen Wake Lock: stops the phone sleeping while the Orders page is open. */
function useWakeLock() {
  const [on, setOn] = useState(false);
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const wantRef = useRef(false);
  // Read after load, not during the server render, so the two agree.
  const supported = useSyncExternalStore(
    () => () => {},
    () => "wakeLock" in navigator,
    () => false
  );

  const acquire = useCallback(async () => {
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
      lockRef.current.addEventListener("release", () => {
        if (!wantRef.current) setOn(false);
      });
      setOn(true);
    } catch {
      setOn(false);
    }
  }, []);

  // The browser drops the lock whenever the page is hidden; take it back on
  // return, if it was on.
  useEffect(() => {
    const back = () => {
      if (wantRef.current && document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      void lockRef.current?.release().catch(() => {});
    };
  }, [acquire]);

  const toggle = useCallback(async () => {
    if (wantRef.current) {
      wantRef.current = false;
      await lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      setOn(false);
    } else {
      wantRef.current = true;
      await acquire();
    }
  }, [acquire]);

  return { supported, on, toggle };
}
