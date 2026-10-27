"use client";

/**
 * Browser side of staff push alerts: register the service worker, ask for
 * permission, subscribe, and tell the server. See lib/push/send.ts.
 */

export type PushState =
  | "unsupported" // this browser can't do web push at all
  | "needs-home-screen" // iPhone/iPad: only works once added to the Home Screen
  | "blocked" // the person (or browser) said no; only browser settings can undo it
  | "off"
  | "on";

const SW_URL = "/staff-sw.js";
const SW_SCOPE = "/admin/";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (isIos() && !isStandalone()) return "needs-home-screen";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox/.test(ua) ? "Firefox" : /Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "browser";
  return `${device} · ${browser}`;
}

/**
 * Turn alerts on for this device. Must be called from a tap: browsers only
 * show the permission question in response to one.
 */
export async function enablePush(): Promise<{ state: PushState; error?: string }> {
  const before = await getPushState();
  if (before === "unsupported" || before === "needs-home-screen") return { state: before };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { state: permission === "denied" ? "blocked" : "off" };

  const reg = await registration();
  if (!reg) return { state: "off", error: "This browser would not start the alert service." };
  await navigator.serviceWorker.ready;

  const keyRes = await fetch("/api/push/key");
  if (!keyRes.ok) return { state: "off", error: "Alerts aren't set up on the server yet." };
  const { publicKey } = (await keyRes.json()) as { publicKey: string };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    } catch (e) {
      return { state: "off", error: e instanceof Error ? e.message : "Could not subscribe." };
    }
  }

  const save = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), label: deviceLabel() }),
  });
  if (!save.ok) return { state: "off", error: "Could not save this device. Are you signed in as staff?" };
  return { state: "on" };
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return getPushState();
}

/** Ask the server to push a test alert to this person's devices. */
export async function sendTestPush(): Promise<number> {
  const res = await fetch("/api/push/test", { method: "POST" });
  if (!res.ok) return 0;
  const { sent } = (await res.json()) as { sent: number };
  return sent;
}

/**
 * Show a notification from the page itself (page open, phone awake).
 * Through the service worker where there is one: Android Chrome refuses
 * `new Notification()` outright ("Illegal constructor"), which used to throw
 * inside the alarm and stop it mid-way.
 */
export async function showLocalNotification(title: string, body: string, tag: string): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration(SW_SCOPE);
    if (reg) {
      await reg.showNotification(title, { body, tag, requireInteraction: true, icon: "/staff-icon-192.png", data: { url: "/admin/orders" } });
      return;
    }
  } catch {
    // fall through to the page notification
  }
  try {
    new Notification(title, { body, tag, requireInteraction: true, icon: "/staff-icon-192.png" });
  } catch {
    // no notification on this browser; the sound and the page still alert
  }
}
