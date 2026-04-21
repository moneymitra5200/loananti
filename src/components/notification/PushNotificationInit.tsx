'use client';
/**
 * PushNotificationInit
 * ─────────────────────────────────────────────────────────────────────────
 * Drop this once inside any layout that is rendered after login.
 * It:
 *  1. Registers the FCM service worker
 *  2. Asks for notification permission (once per device)
 *  3. Saves the FCM token to the server
 *  4. Shows a browser-native notification for foreground messages
 *  5. Auto-refreshes the bell count every 30 s
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';

export default function PushNotificationInit() {
  const { user } = useAuth();
  const initialised = useRef(false);

  useEffect(() => {
    if (!user?.id || initialised.current) return;
    initialised.current = true;

    const init = async () => {
      // 1. Register service worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          console.log('[Push] Service worker registered');
        } catch (e) {
          console.error('[Push] Service worker registration failed:', e);
          return;
        }
      } else {
        return; // push not supported
      }

      // 2. Request permission + get token
      //    Only auto-prompt if not already granted/denied
      const currentPermission = Notification.permission;
      if (currentPermission === 'denied') return;

      let token: string | undefined;
      if (currentPermission === 'granted') {
        // Already have permission — just get the token
        const { token: t } = await requestNotificationPermission();
        token = t;
      } else {
        // First time — ask
        const result = await requestNotificationPermission();
        if (!result.success) return;
        token = result.token;
      }

      if (!token) return;

      // 3. Save token to server
      await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, fcmToken: token }),
      });
      console.log('[Push] FCM token saved for user', user.id);

      // 4. Handle foreground messages — show browser notification + toast
      onForegroundMessage((payload) => {
        const title = payload.notification?.title || 'MoneyMitra';
        const body  = payload.notification?.body  || 'You have a new notification';

        // Show native browser notification even when app is open
        if (Notification.permission === 'granted') {
          const n = new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: (payload.data?.type as string) || 'general',
          });
          n.onclick = () => {
            window.focus();
            if (payload.data?.actionUrl) window.location.href = payload.data.actionUrl as string;
            n.close();
          };
        }

        // Also show an in-app toast
        toast(title, { description: body });

        // Fire a custom event so NotificationBell refreshes
        window.dispatchEvent(new Event('new-notification'));
      });
    };

    init();
  }, [user?.id]);

  return null; // no UI
}
