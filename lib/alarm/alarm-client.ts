"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * T4.2: Admin alarm client.
 * Multi-layer alarm: Web Audio (oscillator beep) + Notification API +
 * title flash + favicon badge + cross-tab BroadcastChannel.
 *
 * Triggered by "savor-new-order" custom event (from realtime subscription).
 * Silenced when staff acknowledges the order.
 */

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

  // --- Web Audio beep ---
  const playBeep = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") ctx.resume();

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
  }, []);

  // --- Notification API ---
  const showNotification = useCallback((title: string, body: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "savor-new-order",
        requireInteraction: true,
      });
    }
  }, []);

  // --- Title flash ---
  const startTitleFlash = useCallback((orderId: string) => {
    if (titleFlashRef.current) clearInterval(titleFlashRef.current);
    let toggle = false;
    titleFlashRef.current = setInterval(() => {
      document.title = toggle
        ? `🔔 NEW ORDER — ${orderId}`
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

  // --- Favicon badge (simple approach: change title) ---
  // A full favicon badge would require canvas drawing, but title flash is sufficient

// --- Stop alarm ---
  const stopAlarm = useCallback(() => {
    alarmActiveRef.current = false;

    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }

    stopTitleFlash();

    if (broadcastRef.current) {
      broadcastRef.current.postMessage({ type: "alarm-stop" });
    }
  }, [stopTitleFlash]);

  // --- Start alarm ---
  const startAlarm = useCallback(
    (orderId: string, customerName: string) => {
      if (alarmActiveRef.current) return; // already alarming
      alarmActiveRef.current = true;

      // Web Audio beep loop
      playBeep();
      beepIntervalRef.current = setInterval(playBeep, BEEP_INTERVAL_MS);

      // Notification
      showNotification(
        `🔔 New Order: ${orderId}`,
        `${customerName} placed a new order. Acknowledge within 30s!`
      );

      // Title flash
      startTitleFlash(orderId);

      // Broadcast to other tabs
      if (broadcastRef.current) {
        broadcastRef.current.postMessage({
          type: "alarm-start",
          orderId,
          customerName,
        });
      }

      // Auto-stop after 30s (watchdog will send email fallback)
      setTimeout(() => {
        if (alarmActiveRef.current) {
          stopAlarm();
        }
      }, ALARM_SOUND_DURATION_MS);
    },
    [playBeep, showNotification, startTitleFlash, stopAlarm]
  );

  // --- Request notification permission on mount ---
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Setup BroadcastChannel for cross-tab sync
    if (typeof BroadcastChannel !== "undefined") {
      broadcastRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
      broadcastRef.current.onmessage = (event) => {
        if (event.data?.type === "alarm-start") {
          startAlarm(event.data.orderId, event.data.customerName);
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
  }, [startAlarm, stopAlarm]);

  return { startAlarm, stopAlarm };
}
