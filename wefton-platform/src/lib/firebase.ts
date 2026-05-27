// ============================================================
// Wefton Copper — Firebase Configuration (lazy initialization)
// ============================================================
// IMPORTANT: Next.js only inlines NEXT_PUBLIC_* env vars when accessed
// as static string literals (e.g., process.env.NEXT_PUBLIC_FIREBASE_API_KEY).
// Dynamic access like process.env[variable] does NOT work on the client.
// ============================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, setLogLevel } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Suppress noisy Firestore gRPC warnings during SSR
if (typeof window === 'undefined') {
  try { setLogLevel('error'); } catch { /* ignore */ }
}

/**
 * Builds the Firebase config object using STATIC env var references.
 * Each must be a literal string for Next.js to inline them at build time.
 */
function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/**
 * Validates Firebase config by checking the actual config values (not dynamic env access).
 */
function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();

  if (!config.apiKey || !config.projectId) {
    // Only log error on client side (server-side may not have vars during build)
    if (typeof window !== 'undefined') {
      console.error(
        '[Wefton Firebase] Firebase is not configured.\n' +
          'Ensure your .env.local file contains NEXT_PUBLIC_FIREBASE_* variables.\n' +
          'Then restart the dev server (env vars are only loaded on startup).'
      );
    }
    return false;
  }

  return true;
}

// Cached instances for lazy initialization
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _initialized = false;

/**
 * Lazily initializes the Firebase app instance.
 * Returns null gracefully if environment variables are missing.
 */
function initApp(): FirebaseApp | null {
  if (_initialized) return _app;
  _initialized = true;

  if (!isFirebaseConfigured()) {
    _app = null;
    return null;
  }

  try {
    _app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  } catch (error) {
    console.error(
      '[Wefton Firebase] Failed to initialize Firebase app:',
      error instanceof Error ? error.message : error
    );
    _app = null;
  }

  return _app;
}

// ============================================================
// Lazy Getters — safe to call anywhere; return null when not configured
// ============================================================

export function getFirebaseApp(): FirebaseApp | null {
  return initApp();
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;
  const app = initApp();
  if (!app) return null;

  try {
    _auth = getAuth(app);
  } catch (error) {
    console.error('[Wefton Firebase] Failed to initialize Auth:', error instanceof Error ? error.message : error);
    _auth = null;
  }
  return _auth;
}

export function getFirebaseDb(): Firestore | null {
  if (_db) return _db;
  const app = initApp();
  if (!app) return null;

  try {
    _db = getFirestore(app);
  } catch (error) {
    console.error('[Wefton Firebase] Failed to initialize Firestore:', error instanceof Error ? error.message : error);
    _db = null;
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (_storage) return _storage;
  const app = initApp();
  if (!app) return null;

  try {
    _storage = getStorage(app);
  } catch (error) {
    console.error('[Wefton Firebase] Failed to initialize Storage:', error instanceof Error ? error.message : error);
    _storage = null;
  }
  return _storage;
}