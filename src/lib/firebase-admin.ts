/**
 * Firebase Admin SDK - Server-side Firebase initialization
 * Used for sending push notifications via FCM
 */

import admin from 'firebase-admin';

// Lazy initialization flag
let isInitialized = false;

// Cached init error for diagnostics
let initError: string | null = null;

/**
 * Initialize Firebase Admin SDK
 * Only initializes when actually needed, not at module load time
 */
function initializeFirebase(): boolean {
  if (isInitialized && admin.apps.length > 0) {
    return true;
  }

  try {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let   privateKey  = process.env.FIREBASE_PRIVATE_KEY;

    // Skip initialization if credentials are missing (e.g., during build)
    if (!projectId || !clientEmail || !privateKey) {
      initError = `Missing env vars: ${!projectId ? 'FIREBASE_PROJECT_ID ' : ''}${!clientEmail ? 'FIREBASE_CLIENT_EMAIL ' : ''}${!privateKey ? 'FIREBASE_PRIVATE_KEY' : ''}`;
      console.log('[Firebase Admin] Skipping initialization -', initError);
      return false;
    }

    // ── Robust private key normalisation ─────────────────────────────────────
    // Hostinger hPanel can store the key in several formats depending on how it
    // was pasted. Handle all of them:
    //   1. Remove surrounding quotes if present  → "-----BEGIN..." or '-----BEGIN...'
    //   2. Replace double-escaped \\n → \n (JSON-encoded inside env var)
    //   3. Replace single-escaped \n → actual newline (standard .env format)
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    // Handle double-escape first \\n → \n, then single \n → newline
    privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    isInitialized = true;
    initError     = null;
    console.log('[Firebase Admin] ✅ Initialized successfully for project:', projectId);
    return true;
  } catch (error: any) {
    initError = error?.message || String(error);
    console.error('[Firebase Admin] ❌ Initialization error:', initError);
    return false;
  }
}

/** Expose last init error for diagnostics (used by test-notification endpoint) */
export function getFirebaseInitError(): string | null {
  return initError;
}

/**
 * Get Firebase Messaging instance
 * Returns null if not initialized
 */
function getMessaging(): admin.messaging.Messaging | null {
  if (!initializeFirebase()) {
    return null;
  }
  return admin.messaging();
}

export const firebaseAdmin = admin;

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
  const messaging = getMessaging();

  if (!messaging) {
    console.log('[Push Notification] Firebase not initialized, skipping push notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data || {},
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192x192.png',
          image: notification.image,
          badge: '/icons/icon-72x72.png',
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
          title: notification.title,
          body: notification.body,
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
  const messaging = getMessaging();

  if (!messaging) {
    console.log('[Push Notification] Firebase not initialized, skipping push notification');
    return { success: false, successCount: 0, failureCount: 0, errors: ['Firebase not initialized'] };
  }

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
      },
      data: data || {},
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192x192.png',
          image: notification.image,
          badge: '/icons/icon-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
        fcmOptions: {
          link: data?.actionUrl || '/',
        },
      },
      android: {
        notification: {
          title: notification.title,
          body: notification.body,
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
