// ============================================================
// Wefton Copper — Wishlist Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

interface WishlistStore {
  items: string[]; // productIds
  toggle: (productId: string, userId?: string) => Promise<void>;
  has: (productId: string) => boolean;
  syncFromFirestore: (userId: string) => Promise<void>;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: async (productId: string, userId?: string) => {
        const isInWishlist = get().items.includes(productId);

        // Optimistic update
        set((state) => ({
          items: isInWishlist
            ? state.items.filter((id) => id !== productId)
            : [...state.items, productId],
        }));

        // Sync to Firestore for authenticated users
        if (userId) {
          const db = getFirebaseDb();
          if (db) {
            try {
              const userRef = doc(db, 'users', userId);
              if (isInWishlist) {
                await updateDoc(userRef, { wishlist: arrayRemove(productId) });
              } else {
                await updateDoc(userRef, { wishlist: arrayUnion(productId) });
              }
            } catch (error) {
              // Revert optimistic update on failure
              console.error('[Wefton Wishlist] Firestore sync failed:', error);
              set((state) => ({
                items: isInWishlist
                  ? [...state.items, productId]
                  : state.items.filter((id) => id !== productId),
              }));
            }
          }
        }
      },

      has: (productId) => get().items.includes(productId),

      syncFromFirestore: async (userId: string) => {
        const db = getFirebaseDb();
        if (!db) return;

        try {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            const wishlist = data.wishlist || [];
            set({ items: wishlist });
          }
        } catch (error) {
          console.error('[Wefton Wishlist] Failed to sync from Firestore:', error);
        }
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'wefton-wishlist' }
  )
);
