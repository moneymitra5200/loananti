// Firebase Cloud Messaging Service Worker
// This handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyCF4gb2yUKlONY4MzUzZkP3pHQKPWmirmM",
  authDomain: "moneymitra-70b76.firebaseapp.com",
  projectId: "moneymitra-70b76",
  storageBucket: "moneymitra-70b76.firebasestorage.app",
  messagingSenderId: "134001766587",
  appId: "1:134001766587:web:f9912f485295b51b93f99e",
  measurementId: "G-HEY81VX5T1"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'MoneyMitra';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.type || 'general',
    requireInteraction: true,
    data: {
      url: payload.data?.actionUrl || '/',
      ...payload.data,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Handle action click
  if (event.action === 'close') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/';

  // Open or focus the window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if no existing window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
});

console.log('[firebase-messaging-sw.js] Service Worker loaded');
