'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

export function useAuthListener() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Firebase not configured — skip auth listener
      setLoading(false);
      return;
    }

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
        // Minimal user from Firebase Auth
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
