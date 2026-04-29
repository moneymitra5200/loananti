'use client';
/**
 * PushNotificationInit
 * ─────────────────────────────────────────────────────────────────────────
 * Drop this once inside any layout rendered after login.
 * It:
 *  1. Requests notification permission (once per device per session)
 *  2. Gets the FCM token (using the firebase-messaging-sw.js registration)
 *  3. Saves the FCM token to the server
 *  4. Shows a native notification + in-app toast for foreground messages
 *  5. Auto-refreshes the bell count every 30 s
 *
 * IMPORTANT: The service worker registration (firebase-messaging-sw.js) is
 * handled inside requestNotificationPermission() in firebase.ts. This is
 * critical for PWA installs — without it, getToken() binds to sw.js
 * (workbox) and push messages are never delivered.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';

export default function PushNotificationInit() {
  const { user } = useAuth();
  const initialised = useRef(false);

  useEffect(() => {
    // Only run once per user session
    if (!user?.id || initialised.current) return;
    initialised.current = true;

    const init = async () => {
      // ── Guard: push notifications require service worker support ──────────
      if (!('serviceWorker' in navigator)) {
        console.warn('[Push] Service workers not supported — push notifications unavailable');
        return;
      }

      // ── Guard: if user has explicitly denied, don't nag ───────────────────
      if (Notification.permission === 'denied') {
        console.warn('[Push] Notifications blocked by user — no action taken');
        return;
      }

      // ── Request permission + get FCM token ────────────────────────────────
      // requestNotificationPermission() handles:
      //   • Asking for Notification permission (if not already granted)
      //   • Registering /firebase-messaging-sw.js (if not already registered)
      //   • Calling getToken() with the correct serviceWorkerRegistration
      const result = await requestNotificationPermission();

      if (!result.success || !result.token) {
        console.warn('[Push] Could not get FCM token:', result.error);
        return;
      }

      // ── Save FCM token to server ───────────────────────────────────────────
      try {
        const res = await fetch('/api/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, fcmToken: result.token }),
        });
        const data = await res.json();
        if (data.success) {
          console.log('[Push] FCM token saved for user', user.id);
        } else {
          console.error('[Push] Server rejected FCM token:', data.error);
        }
      } catch (saveErr) {
        console.error('[Push] Failed to save FCM token to server:', saveErr);
      }

      // ── Handle foreground messages ─────────────────────────────────────────
      // When the app is OPEN (foreground), Firebase does NOT show an OS
      // notification automatically. We handle it manually here.
      onForegroundMessage((payload) => {
        const title = payload.notification?.title || 'Money Mitra';
        const body  = payload.notification?.body  || 'You have a new notification';

        // Show a native OS notification even while the app is open
        if (Notification.permission === 'granted') {
          try {
            const n = new Notification(title, {
              body,
              icon: '/logo-circle.png',
              badge: '/logo-circle.png',
              tag: (payload.data?.type as string) || 'general',
              requireInteraction: false,
            });
            n.onclick = () => {
              window.focus();
              if (payload.data?.actionUrl) {
                window.location.href = payload.data.actionUrl as string;
              }
              n.close();
            };
          } catch (notifErr) {
            console.warn('[Push] Could not show native notification:', notifErr);
          }
        }

        // In-app toast notification
        toast(title, { description: body, duration: 6000 });

        // Trigger NotificationBell to refresh immediately
        window.dispatchEvent(new Event('new-notification'));
      });
    };

    init();
  }, [user?.id]);

  return null; // purely logic, no UI
}
