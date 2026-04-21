// Firebase Cloud Messaging Service Worker
// Handles background push notifications and deep-link navigation

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCF4gb2yUKlONY4MzUzZkP3pHQKPWmirmM",
  authDomain: "moneymitra-70b76.firebaseapp.com",
  projectId: "moneymitra-70b76",
  storageBucket: "moneymitra-70b76.firebasestorage.app",
  messagingSenderId: "134001766587",
  appId: "1:134001766587:web:f9912f485295b51b93f99e",
  measurementId: "G-HEY81VX5T1"
});

const messaging = firebase.messaging();

// ── Background message handler ──────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  // Resolve the deep-link URL
  const actionUrl = payload.data?.actionUrl
    || payload.notification?.click_action
    || '/';

  const notificationTitle   = payload.notification?.title   || 'Money Mitra';
  const notificationOptions = {
    body:               payload.notification?.body || 'You have a new notification',
    icon:               '/logo-circle.png',
    badge:              '/badge-72x72.png',
    vibrate:            [200, 100, 200, 100, 200],
    tag:                payload.data?.type || 'general',
    requireInteraction: true,
    renotify:           true,
    data: {
      url: actionUrl,
      ...payload.data,
    },
    actions: [
      { action: 'open',  title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Notification click → deep-link navigation ──────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked, action:', event.action);

  event.notification.close();

  if (event.action === 'close') return;

  // Get the target URL – stored in notification.data.url by the handler above
  const targetUrl = event.notification.data?.url || '/';
  const fullUrl   = self.location.origin + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Try to reuse an existing open window and navigate it
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        // No existing window — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      })
  );
});

// ── Notification dismissed ─────────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

console.log('[SW] firebase-messaging-sw.js loaded OK');
