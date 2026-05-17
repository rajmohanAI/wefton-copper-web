// ============================================================
// Wefton Copper — Authentication Service
// ============================================================
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  updateProfile,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import type { User } from '@/types';

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not configured');
  return auth;
}

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase Firestore not configured');
  return db;
}

// ── Helpers ──────────────────────────────────────────────────

async function upsertUserDoc(firebaseUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
}): Promise<User> {
  const db = requireDb();
  const ref = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newUser = {
      name: firebaseUser.displayName || 'Wefton Member',
      email: firebaseUser.email || '',
      phone: firebaseUser.phoneNumber || '',
      avatar: firebaseUser.photoURL || '',
      addresses: [],
      wishlist: [],
      orders: [],
      role: 'user' as const,
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, newUser);
    return { uid: firebaseUser.uid, ...newUser, createdAt: new Date().toISOString() };
  }

  return { uid: firebaseUser.uid, ...(snap.data() as Omit<User, 'uid'>) };
}

// ── Google OAuth ──────────────────────────────────────────────

export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth();
  const result = await signInWithPopup(auth, googleProvider);
  return upsertUserDoc(result.user);
}

// ── Facebook OAuth ────────────────────────────────────────────

export async function signInWithFacebook(): Promise<User> {
  const auth = requireAuth();
  const result = await signInWithPopup(auth, facebookProvider);
  return upsertUserDoc(result.user);
}

// ── Email / Password ──────────────────────────────────────────

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const auth = requireAuth();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return upsertUserDoc({ ...result.user, displayName: name });
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return upsertUserDoc(result.user);
}

export async function resetPassword(email: string): Promise<void> {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email);
}

// ── Phone OTP ─────────────────────────────────────────────────

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = requireAuth();
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

export async function sendOTP(
  phone: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = requireAuth();
  return signInWithPhoneNumber(auth, phone, recaptchaVerifier);
}

export async function verifyOTP(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<User> {
  const result = await confirmationResult.confirm(otp);
  return upsertUserDoc(result.user);
}

// ── Sign Out ──────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const auth = requireAuth();
  await signOut(auth);
}
