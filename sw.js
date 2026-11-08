/* HALF LIFE: the background helper that shows notifications (it does nothing else: it never touches pages or
   caches anything). A push from halflife.studio carries no words, so when one arrives this asks the site what the
   newest entry is (/api/push/latest) and shows that. Tapping the notification opens the entry. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let n = { title: "Half Life", body: "A new entry has been set down.", url: "/" };
    try { const r = await fetch("/api/push/latest", { cache: "no-store" }); if (r.ok) n = { ...n, ...(await r.json()) }; } catch (err) {}
    await self.registration.showNotification(n.title, { body: n.body, icon: "/site/icon-192.png", badge: "/site/icon-192.png", tag: "half-life-entry", data: { url: n.url } });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of open) if (c.url.startsWith(self.location.origin)) { await c.focus(); return c.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
