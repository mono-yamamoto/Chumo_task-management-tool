// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    // 不正なJSONペイロードは無視
  }

  // FCM notification + data 形式と、フラットな data 形式の両方に対応
  const notification = payload.notification || {};
  const data = payload.data || payload;

  const title = notification.title || data.title || '通知';
  const options = {
    body: notification.body || data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.clickAction || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
