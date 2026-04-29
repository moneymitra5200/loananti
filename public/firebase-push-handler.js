/**
 * firebase-push-handler.js
 * ─────────────────────────────────────────────────────────────────────────
 * Imported by sw.js (workbox) via next-pwa's importScripts option.
 * Handles FCM background push events so notifications appear even when
 * the app is closed / backgrounded — without needing a separate
 * firebase-messaging-sw.js active service worker (which conflicts with sw.js).
 */

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('[PushHandler] Empty push event — ignoring');
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { notification: { title: 'Money Mitra', body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title   = notification.title || 'Money Mitra';
  const body    = notification.body  || 'You have a new notification';
  const iconUrl = notification.icon  || '/logo-circle.png';
  const actionUrl = data.actionUrl   || '/';

  const options = {
    body,
    icon: iconUrl,
    badge:  '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.type || 'general',
    requireInteraction: false,
    renotify: true,
    data: { url: actionUrl, ...data },
    actions: [
      { action: 'open',  title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl   = self.location.origin + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
      })
  );
});

console.log('[PushHandler] Money Mitra push handler registered in sw.js');
