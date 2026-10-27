/* Savor staff alerts: service worker (registered by the admin Orders page,
 * scope /admin/). Shows a notification when the server pushes, even with the
 * phone locked or the browser closed. See lib/push/send.ts.
 *
 * Pushes carry no data. On each one this asks /api/push/latest, signed in as
 * the staff member, what happened, and shows that. If it can't find out, it
 * still shows something: a push that shows nothing is the one failure staff
 * can't see. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let alert = {
        id: Date.now(),
        kind: "order",
        title: "🔔 Savor by Dee",
        body: "Something new needs attention. Tap to open Orders.",
        url: "/admin/orders",
      };
      try {
        const res = await fetch("/api/push/latest", { credentials: "include", cache: "no-store" });
        if (res.status === 200) alert = { ...alert, ...(await res.json()) };
      } catch {
        // offline or signed out: the generic text above still goes out
      }
      await self.registration.showNotification(alert.title, {
        body: alert.body,
        tag: `savor-${alert.kind}-${alert.id}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500],
        icon: "/staff-icon-192.png",
        badge: "/staff-icon-192.png",
        data: { url: alert.url || "/admin/orders" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/orders";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.includes("/admin")) {
          await w.focus();
          if ("navigate" in w) await w.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
