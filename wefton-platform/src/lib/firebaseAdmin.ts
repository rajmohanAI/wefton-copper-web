// ============================================================
// Wefton Copper — Firebase Admin (server only)
// On Firebase App Hosting the Admin SDK picks up the backend's service
// account automatically. Locally, point GOOGLE_APPLICATION_CREDENTIALS at a
// service-account key file (never commit it).
// Never import this from a client component.
// ============================================================
import { initializeApp, getApps, getApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function adminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export function getAdminAuth(): Auth {
  return getAuth(adminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(adminApp());
}

/** The project's Storage bucket (customer uploads such as Wheez return photos). */
export function getAdminBucket() {
  return getStorage(adminApp()).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}
