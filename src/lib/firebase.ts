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
let analytics;
if (typeof window !== "undefined") {
  const { getAnalytics } = require("firebase/analytics");
  analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
