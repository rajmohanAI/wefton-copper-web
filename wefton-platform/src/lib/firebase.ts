// ============================================================
// Wefton Copper — Firebase Configuration (lazy init)
// ============================================================
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize when a real API key is present (avoids SSR build errors)
function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_api_key_here') {
    return null;
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// Lazy getters — safe to call anywhere; return null when not configured
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  return app ? getStorage(app) : null;
}

// Convenience exports (may be null before Firebase is configured)
export const app = getFirebaseApp();
export const auth = app ? getAuth(app) : null!;
export const db = app ? getFirestore(app) : null!;
export const storage = app ? getStorage(app) : null!;

export default app;
