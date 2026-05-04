import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User as FirebaseUser,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential
} from 'firebase/auth';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCF4gb2yUKlONY4MzUzZkP3pHQKPWmirmM",
  authDomain: "moneymitra-70b76.firebaseapp.com",
  projectId: "moneymitra-70b76",
  storageBucket: "moneymitra-70b76.firebasestorage.app",
  messagingSenderId: "134001766587",
  appId: "1:134001766587:web:f9912f485295b51b93f99e",
  measurementId: "G-HEY81VX5T1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics safely (it only works on the browser/client-side)
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Messaging (client-side only)
let messagingInstance: Messaging | null = null;
if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
  try {
    messagingInstance = getMessaging(app);
  } catch (error) {
    console.error('[Firebase] Messaging initialization error:', error);
  }
}
export const messaging_ = messagingInstance;

// VAPID Key for web push
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BGpGe_IFqrZnrDoeQ2DWvpBhxfjyAPBczKnoGrbvfK4QhKWUD95cirGDuYOJ0SzOO3F6ne5rtbKq5DySO_CdHY8';

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<{ success: boolean; token?: string; error?: string }> => {
  try {
    if (!messagingInstance) {
      return { success: false, error: 'Firebase Messaging not initialized (service worker or browser not supported)' };
    }

    // Request permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission denied by user' };
    }

    // ── CRITICAL FIX: Explicitly register firebase-messaging-sw.js ────────
    // FCM requires its OWN service worker to issue valid tokens and receive
    // background messages. Using the Workbox SW (sw.js) causes FCM to return
    // empty/invalid tokens because it's not the expected Firebase SW.
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        // Register (or get existing) firebase-messaging-sw.js
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        // Wait for it to be active before requesting a token
        await navigator.serviceWorker.ready;
        console.log('[FCM] firebase-messaging-sw.js registered, state:', swRegistration.active?.state);
      } catch (swErr) {
        console.warn('[FCM] Could not register firebase-messaging-sw.js, trying fallback:', swErr);
        try {
          // Fallback: find any existing SW that has firebase in the URL
          const regs = await navigator.serviceWorker.getRegistrations();
          swRegistration = regs.find(r =>
            r.active?.scriptURL?.includes('firebase-messaging-sw') ||
            r.installing?.scriptURL?.includes('firebase-messaging-sw')
          ) ?? regs[0];
        } catch { /* use no SW registration */ }
      }
    }

    // Get FCM token — MUST be bound to the firebase-messaging-sw.js registration
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
    });

    if (!token) {
      return { success: false, error: 'FCM returned empty token — check notification permission and SW registration' };
    }

    console.log('[FCM] ✅ Token obtained:', token.substring(0, 20) + '...');
    return { success: true, token };
  } catch (error: any) {
    console.error('[FCM] Error getting token:', error);
    return { success: false, error: error.message };
  }
};


/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: MessagePayload) => void): (() => void) | undefined => {
  if (!messagingInstance) {
    console.warn('[FCM] Messaging not initialized');
    return undefined;
  }

  return onMessage(messagingInstance, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};

/**
 * Get current FCM token
 */
export const getCurrentFCMToken = async (): Promise<string | null> => {
  try {
    if (!messagingInstance) return null;
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.getRegistration('/');
      } catch { /* ignore */ }
    }
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      ...(swRegistration ? { serviceWorkerRegistration: swRegistration } : {}),
    });
    return token || null;
  } catch (error) {
    console.error('[FCM] Error getting current token:', error);
    return null;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return { success: true, user: result.user };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
};

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export const initRecaptcha = (buttonId: string) => {
  if (typeof window !== 'undefined') {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
      size: 'invisible',
      callback: () => {},
    });
  }
};

export const sendPhoneOTP = async (phoneNumber: string, buttonId: string) => {
  try {
    initRecaptcha(buttonId);
    const appVerifier = window.recaptchaVerifier!;
    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(phoneNumber, appVerifier);
    return { success: true, verificationId };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
};

export const verifyPhoneOTP = async (verificationId: string, otp: string) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const result = await signInWithCredential(auth, credential);
    return { success: true, user: result.user };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
};

export type { FirebaseUser };
