// CampusPerk Push Notification Service Worker
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "CampusPerk";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/campusperk-favicon.png",
    badge: "/campusperk-favicon.png",
    tag: data.tag || "campusperk-notification",
    data: { url: data.url || "/dashboard", deal_id: data.deal_id },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
