'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

/**
 * Subscribes to Firebase Auth state changes and populates the authStore.
 * Configures browserLocalPersistence so sessions survive browser restarts.
 * On auth state change, fetches the user document from Firestore `users/{uid}`.
 */
export function useAuthListener() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Firebase not configured — skip auth listener
      setLoading(false);
      return;
    }

    // Configure browserLocalPersistence for session persistence across browser restarts
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('[Wefton Auth] Failed to set persistence:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const db = getFirebaseDb();
          if (db) {
            const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (snap.exists()) {
              setUser({ uid: firebaseUser.uid, ...(snap.data() as Omit<User, 'uid'>) });
              setLoading(false);
              return;
            }
          }
        } catch {
          // Firestore error — fall through to minimal user
        }
        // Minimal user from Firebase Auth when Firestore doc doesn't exist
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          addresses: [],
          wishlist: [],
          orders: [],
          role: 'user',
          createdAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);
}

/**
 * Convenience hook that returns the current auth state from the store.
 * Returns `{ user, loading, isAdmin }` for use in protected components.
 *
 * Requirements: 17.1, 17.2, 17.5
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const isAdmin = useAuthStore((state) => state.isAdmin());

  return { user, loading, isAdmin };
}
