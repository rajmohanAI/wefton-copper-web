// ============================================================
// Wefton Copper — Wishlist Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistStore {
  items: string[]; // productIds
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (productId) => {
        set((state) => ({
          items: state.items.includes(productId)
            ? state.items.filter((id) => id !== productId)
            : [...state.items, productId],
        }));
      },

      has: (productId) => get().items.includes(productId),

      clear: () => set({ items: [] }),
    }),
    { name: 'wefton-wishlist' }
  )
);
