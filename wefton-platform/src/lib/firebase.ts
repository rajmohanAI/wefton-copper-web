// ============================================================
// Wefton Copper — Firebase Configuration (lazy initialization)
// ============================================================
// This module uses lazy getters to avoid SSR build errors when
// environment variables are not configured. All service functions
// should check for `null` returns and throw descriptive errors.
// ============================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Required environment variable keys for Firebase initialization
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

/**
 * Validates that all required Firebase environment variables are present.
 * Logs descriptive errors for any missing variables.
 * Returns true if all required vars are set, false otherwise.
 */
function validateFirebaseEnv(): boolean {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.startsWith('your_')) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      `[Wefton Firebase] Missing required environment variables:\n` +
        missing.map((key) => `  - ${key}`).join('\n') +
        `\n\nFirebase services will not be available. ` +
        `Copy .env.local.example to .env.local and fill in your Firebase project values.`
    );
    return false;
  }

  return true;
}

/**
 * Builds the Firebase config object from environment variables.
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

// Cached instances for lazy initialization
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _initialized = false;
let _valid = false;

/**
 * Lazily initializes the Firebase app instance.
 * Returns null gracefully if environment variables are missing.
 */
function initApp(): FirebaseApp | null {
  if (_initialized) return _app;
  _initialized = true;

  _valid = validateFirebaseEnv();
  if (!_valid) {
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

/**
 * Returns the Firebase App instance, or null if not configured.
 * Logs a descriptive error on first call if env vars are missing.
 */
export function getFirebaseApp(): FirebaseApp | null {
  return initApp();
}

/**
 * Returns the Firebase Auth instance, or null if not configured.
 * Caches the instance after first successful initialization.
 */
export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;

  const app = initApp();
  if (!app) return null;

  try {
    _auth = getAuth(app);
  } catch (error) {
    console.error(
      '[Wefton Firebase] Failed to initialize Firebase Auth:',
      error instanceof Error ? error.message : error
    );
    _auth = null;
  }

  return _auth;
}

/**
 * Returns the Firestore instance, or null if not configured.
 * Caches the instance after first successful initialization.
 */
export function getFirebaseDb(): Firestore | null {
  if (_db) return _db;

  const app = initApp();
  if (!app) return null;

  try {
    _db = getFirestore(app);
  } catch (error) {
    console.error(
      '[Wefton Firebase] Failed to initialize Firestore:',
      error instanceof Error ? error.message : error
    );
    _db = null;
  }

  return _db;
}

/**
 * Returns the Firebase Storage instance, or null if not configured.
 * Caches the instance after first successful initialization.
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  if (_storage) return _storage;

  const app = initApp();
  if (!app) return null;

  try {
    _storage = getStorage(app);
  } catch (error) {
    console.error(
      '[Wefton Firebase] Failed to initialize Firebase Storage:',
      error instanceof Error ? error.message : error
    );
    _storage = null;
  }

  return _storage;
}
