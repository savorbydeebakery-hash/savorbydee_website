"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  STAFF_ALERTS_CHANNEL,
  CUSTOM_CAKE_EVENT,
  type CustomCakeAlertPayload,
} from "@/lib/alarm/staff-alerts";
import { showLocalNotification } from "@/lib/push/client";

/**
 * T4.2: Admin alarm client, for the Orders page while it is open.
 * Beep (Web Audio) + vibration + notification + title flash + cross-tab sync.
 *
 * Triggered by the "savor-new-order" event (lib/realtime/use-orders-realtime)
 * and by custom cake broadcasts (lib/alarm/staff-alerts.ts). Silenced when
 * staff acknowledge the order.
 *
 * Phones (fixed 2026-10-27, after the alarm rang on a laptop but not on the
 * client's phone in the demo):
 *  - Sound: a phone only lets a page make sound after a tap on it. The beep
 *    used to create its audio on its own when an order arrived, so phones
 *    stayed silent. Audio is now unlocked by the first tap anywhere on the
 *    page, and `soundReady` tells the Orders page to ask for that tap.
 *  - Notifications: Android Chrome refuses `new Notification()` and threw
 *    inside the alarm, stopping it half-way. They now go through the service
 *    worker (lib/push/client.ts), and never throw.
 *  - Vibration, where the phone supports it.
 *  - A locked phone runs no page at all; for that, see push (lib/push).
 */

/** What one alarm says: in the flashing tab title and the pop-up. */
interface AlarmAlert {
  tab: string;
  title: string;
  body: string;
}

const ALARM_SOUND_DURATION_MS = 30000; // 30s max alarm
const BEEP_INTERVAL_MS = 1000; // beep every 1s
const TITLE_FLASH_INTERVAL_MS = 800;
const BROADCAST_CHANNEL = "savor-alarm";

export function useAlarmClient() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "");
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const alarmActiveRef = useRef(false);
  // True once this page is allowed to make sound (after a tap, on phones).
  const [soundReady, setSoundReady] = useState(false);

  const audio = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioContextRef.current) audioContextRef.current = new Ctor();
    return audioContextRef.current;
  }, []);

  /**
   * Must run inside a tap or key press. Resumes audio and plays a silent
   * sound, which is what iOS and Android need before they allow later beeps.
   */
  const unlockSound = useCallback(async () => {
    const ctx = audio();
    if (!ctx) return false;
    try {
      if (ctx.state !== "running") await ctx.resume();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // stays locked; the page keeps asking for a tap
    }
    const ok = ctx.state === "running";
    setSoundReady(ok);
    return ok;
  }, [audio]);

  // --- Web Audio beep ---
  const playBeep = useCallback(() => {
    const ctx = audio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // Android phones also buzz. iPhones ignore this (no vibration API).
    try {
      navigator.vibrate?.(400);
    } catch {}
  }, [audio]);

  // --- Title flash ---
  const startTitleFlash = useCallback((text: string) => {
    if (titleFlashRef.current) clearInterval(titleFlashRef.current);
    let toggle = false;
    titleFlashRef.current = setInterval(() => {
      document.title = toggle
        ? text
        : originalTitleRef.current;
      toggle = !toggle;
    }, TITLE_FLASH_INTERVAL_MS);
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashRef.current) {
      clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
    }
    document.title = originalTitleRef.current;
  }, []);

  // --- Stop alarm ---
  const stopAlarm = useCallback(() => {
    alarmActiveRef.current = false;

    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    try {
      navigator.vibrate?.(0);
    } catch {}

    stopTitleFlash();

    if (broadcastRef.current) {
      broadcastRef.current.postMessage({ type: "alarm-stop" });
    }
  }, [stopTitleFlash]);

  // --- Start alarm ---
  const raiseAlarm = useCallback(
    (alert: AlarmAlert) => {
      if (alarmActiveRef.current) return; // already alarming
      alarmActiveRef.current = true;

      // Each step guarded, so one that a browser refuses can't stop the rest.
      try {
        playBeep();
        beepIntervalRef.current = setInterval(playBeep, BEEP_INTERVAL_MS);
      } catch {}
      void showLocalNotification(alert.title, alert.body, `savor-${alert.tab}`);
      startTitleFlash(alert.tab);

      if (broadcastRef.current) {
        broadcastRef.current.postMessage({ type: "alarm-start", alert });
      }

      // Auto-stop after 30s (the reminder push follows at 5 minutes).
      setTimeout(() => {
        if (alarmActiveRef.current) {
          stopAlarm();
        }
      }, ALARM_SOUND_DURATION_MS);
    },
    [playBeep, startTitleFlash, stopAlarm]
  );

  const startAlarm = useCallback(
    (orderId: string, customerName: string) =>
      raiseAlarm({
        tab: `🔔 NEW ORDER — ${orderId}`,
        title: `🔔 New Order: ${orderId}`,
        body: `${customerName} placed a new order. Open it and press Acknowledge.`,
      }),
    [raiseAlarm]
  );

  /** The Test button: everything a real order does, on this device only. */
  const testAlarm = useCallback(async () => {
    await unlockSound();
    stopAlarm();
    raiseAlarm({
      tab: "🔔 TEST ALARM",
      title: "🔔 Test alarm",
      body: "Sound and alerts are working on this device.",
    });
  }, [unlockSound, stopAlarm, raiseAlarm]);

  // --- New custom cake request ---
  // When it arrived, while the "tell the owner" notice is up; null otherwise.
  const [customCakeAlertAt, setCustomCakeAlertAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(STAFF_ALERTS_CHANNEL)
      .on("broadcast", { event: CUSTOM_CAKE_EVENT }, ({ payload }) => {
        const at = (payload as Partial<CustomCakeAlertPayload> | undefined)?.at;
        setCustomCakeAlertAt(at ?? new Date().toISOString());
        raiseAlarm({
          tab: "🎂 NEW CUSTOM CAKE REQUEST",
          title: "🎂 New custom cake request",
          body: "A customer has asked for a custom cake. Please tell the owner.",
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [raiseAlarm]);

  const dismissCustomCakeAlert = useCallback(() => {
    setCustomCakeAlertAt(null);
    stopAlarm();
  }, [stopAlarm]);

  // The first tap or key press anywhere on the page unlocks sound. Permission
  // for notifications is no longer asked for here: phones ignore a question
  // that doesn't come from a tap, so the Orders page has a button for it.
  useEffect(() => {
    const unlock = () => {
      void unlockSound().then((ok) => {
        if (ok) {
          window.removeEventListener("pointerdown", unlock, true);
          window.removeEventListener("keydown", unlock, true);
        }
      });
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [unlockSound]);

  useEffect(() => {
    // Setup BroadcastChannel for cross-tab sync
    if (typeof BroadcastChannel !== "undefined") {
      broadcastRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
      broadcastRef.current.onmessage = (event) => {
        if (event.data?.type === "alarm-start" && event.data.alert) {
          raiseAlarm(event.data.alert as AlarmAlert);
        } else if (event.data?.type === "alarm-stop") {
          stopAlarm();
        }
      };
    }

    // Listen for new order events from realtime
    const handleNewOrder = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.human_id && detail?.guest_name) {
        startAlarm(detail.human_id, detail.guest_name);
      }
    };
    window.addEventListener("savor-new-order", handleNewOrder);

    // Listen for acknowledge events
    const handleAck = () => stopAlarm();
    window.addEventListener("savor-order-acknowledged", handleAck);

    return () => {
      window.removeEventListener("savor-new-order", handleNewOrder);
      window.removeEventListener("savor-order-acknowledged", handleAck);
      stopAlarm();
      if (broadcastRef.current) {
        broadcastRef.current.close();
        broadcastRef.current = null;
      }
    };
  }, [startAlarm, raiseAlarm, stopAlarm]);

  return {
    startAlarm,
    stopAlarm,
    testAlarm,
    unlockSound,
    soundReady,
    customCakeAlertAt,
    dismissCustomCakeAlert,
  };
}
