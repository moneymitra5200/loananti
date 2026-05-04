'use client';
/**
 * PushNotificationInit
 * ─────────────────────────────────────────────────────────────────────────
 * Handles FCM push notification setup for every role.
 *  1. Requests notification permission on first load
 *  2. Gets the FCM token via firebase-messaging-sw.js
 *  3. Saves the FCM token to the server for this user
 *  4. Shows native OS notification + in-app toast for foreground messages
 *  5. Re-registers the FCM token each time the app becomes visible again
 *     → Fixes: Android swipe from recents → reopen → no notifications
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';

export default function PushNotificationInit() {
  const { user } = useAuth();
  const initialisedRef = useRef(false);
  const savedTokenRef  = useRef<string | null>(null);

  // ── Register / refresh FCM token ─────────────────────────────────────────
  const registerToken = async (userId: string) => {
    if (!('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;

    try {
      const result = await requestNotificationPermission();
      if (!result.success || !result.token) return;

      // Skip DB write if same token is already saved — avoids noise on every resume
      if (result.token === savedTokenRef.current) return;
      savedTokenRef.current = result.token;

      const res = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fcmToken: result.token }),
      });
      const data = await res.json();
      if (data.success) {
        console.log('[Push] ✅ FCM token registered for user', userId);
      } else {
        console.error('[Push] Server rejected FCM token:', data.error);
      }
    } catch (err) {
      console.error('[Push] Failed to register FCM token:', err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // ── One-time setup: initial token + foreground message handler ─────────
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      registerToken(user.id);

      onForegroundMessage((payload) => {
        const title = payload.notification?.title || 'Money Mitra';
        const body  = payload.notification?.body  || 'You have a new notification';

        // Show native OS notification even while app is open (foreground)
        if (Notification.permission === 'granted') {
          try {
            const n = new Notification(title, {
              body,
              icon:  '/logo-circle.png',
              badge: '/logo-circle.png',
              tag:   (payload.data?.type as string) || 'general',
              requireInteraction: false,
            });
            n.onclick = () => {
              window.focus();
              if (payload.data?.actionUrl) {
                window.location.href = payload.data.actionUrl as string;
              }
              n.close();
            };
          } catch { /* SW may show it instead */ }
        }

        // In-app toast
        toast(title, { description: body, duration: 6000 });

        // Refresh the bell count immediately
        window.dispatchEvent(new Event('new-notification'));
      });
    }

    // ── Re-register on every app resume (fixes swipe-from-recents on Android) ──
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        registerToken(user.id);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    // Also handle PWA "focus" restore (some browsers use this instead)
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [user?.id]); // re-run only if user changes

  return null;
}
