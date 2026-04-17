/**
 * usePushNotification Hook
 * Handles FCM token registration and notification permission
 */

import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  onForegroundMessage,
  getCurrentFCMToken,
} from '@/lib/firebase';

interface PushNotificationState {
  isSupported: boolean;
  permissionGranted: boolean;
  fcmToken: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UsePushNotificationReturn extends PushNotificationState {
  requestPermission: () => Promise<void>;
  saveTokenToServer: (userId: string) => Promise<boolean>;
}

export function usePushNotification(userId?: string): UsePushNotificationReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permissionGranted: false,
    fcmToken: null,
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setState(prev => ({ ...prev, isSupported }));

      if (isSupported) {
        const permission = Notification.permission;
        setState(prev => ({
          ...prev,
          permissionGranted: permission === 'granted',
        }));

        // If permission already granted, get token
        if (permission === 'granted') {
          const token = await getCurrentFCMToken();
          setState(prev => ({ ...prev, fcmToken: token, isLoading: false }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSupport();
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (!state.isSupported || !state.permissionGranted) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[Push Notification] Foreground message:', payload);

      // Show toast or in-app notification
      if (payload.notification) {
        // You can integrate with your toast system here
        console.log('Title:', payload.notification.title);
        console.log('Body:', payload.notification.body);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [state.isSupported, state.permissionGranted]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await requestNotificationPermission();

    if (result.success && result.token) {
      setState(prev => ({
        ...prev,
        permissionGranted: true,
        fcmToken: result.token!,
        isLoading: false,
      }));

      // Auto-save token if userId is provided
      if (userId) {
        await saveTokenToServer(userId);
      }
    } else {
      setState(prev => ({
        ...prev,
        permissionGranted: false,
        isLoading: false,
        error: result.error || 'Failed to get notification permission',
      }));
    }
  }, [userId]);

  // Save token to server
  const saveTokenToServer = useCallback(async (uid: string): Promise<boolean> => {
    if (!state.fcmToken) {
      setState(prev => ({ ...prev, error: 'No FCM token to save' }));
      return false;
    }

    try {
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, fcmToken: state.fcmToken }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Push Notification] Token saved to server');
        return true;
      } else {
        console.error('[Push Notification] Failed to save token:', data.error);
        setState(prev => ({ ...prev, error: data.error }));
        return false;
      }
    } catch (error: any) {
      console.error('[Push Notification] Error saving token:', error);
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, [state.fcmToken]);

  return {
    ...state,
    requestPermission,
    saveTokenToServer,
  };
}

export default usePushNotification;
