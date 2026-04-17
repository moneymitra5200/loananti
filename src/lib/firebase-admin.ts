/**
 * Firebase Admin SDK - Server-side Firebase initialization
 * Used for sending push notifications via FCM
 */

import admin from 'firebase-admin';

// Check if already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[Firebase Admin] Initialized successfully');
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error);
  }
}

export const firebaseAdmin = admin;
export const messaging = admin.messaging();

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  fcmToken: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
  },
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.image,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: notification.icon || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' },
          ],
        },
        fcmOptions: {
          link: data?.actionUrl || '/',
        },
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#10b981',
          sound: 'default',
          priority: 'high',
        },
      },
    };

    const messageId = await messaging.send(message);
    console.log('[Push Notification] Sent successfully:', messageId);
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[Push Notification] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendPushNotificationToMany(
  fcmTokens: string[],
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
  },
  data?: Record<string, string>
): Promise<{ success: boolean; successCount: number; failureCount: number; errors?: string[] }> {
  try {
    // Filter out empty tokens
    const validTokens = fcmTokens.filter(token => token && token.trim() !== '');

    if (validTokens.length === 0) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['No valid FCM tokens provided'] };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.image,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: notification.icon || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
        fcmOptions: {
          link: data?.actionUrl || '/',
        },
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#10b981',
          sound: 'default',
          priority: 'high',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`[Push Notification] Sent to ${response.successCount} devices, ${response.failureCount} failed`);

    const errors: string[] = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          errors.push(`Token ${idx}: ${resp.error?.message || 'Unknown error'}`);
        }
      });
    }

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('[Push Notification Multicast] Error:', error.message);
    return { success: false, successCount: 0, failureCount: fcmTokens.length, errors: [error.message] };
  }
}

export default firebaseAdmin;
