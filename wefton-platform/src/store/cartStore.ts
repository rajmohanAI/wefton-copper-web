// ============================================================
// Wefton Copper — Cart Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';
import { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, TAX_RATE } from '@/config/brand';
import { validateCoupon } from '@/services/couponService';
import { trackAddToCart } from '@/lib/analytics';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  discount: number;
  couponError: string;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;

  // Computed
  getItemCount: () => number;
  getSubtotal: () => number;
  getShipping: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      discount: 0,
      couponError: '',

      addItem: (newItem) => {
        set((state) => {
          const key = newItem.variantId || newItem.productId;
          const existing = state.items.find(
            (i) => (i.variantId || i.productId) === key
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                (i.variantId || i.productId) === key
                  ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.inventory) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...newItem, quantity: Math.min(newItem.quantity, newItem.inventory) }] };
        });

        // GA4: Track add_to_cart event
        trackAddToCart({
          item_id: newItem.productId,
          item_name: newItem.title,
          price: newItem.price,
          quantity: newItem.quantity,
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter((i) =>
            variantId ? i.variantId !== variantId : i.productId !== productId
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => {
            const match = variantId ? i.variantId === variantId : i.productId === productId;
            return match ? { ...i, quantity: Math.min(quantity, i.inventory) } : i;
          }),
        }));
      },

      clearCart: () => set({ items: [], couponCode: '', discount: 0, couponError: '' }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: async (code: string) => {
        set({ couponError: '' });
        const result = await validateCoupon(code);
        if (result.valid) {
          set({ couponCode: code.trim().toUpperCase(), discount: result.discount, couponError: '' });
        } else {
          set({ couponCode: '', discount: 0, couponError: result.error || 'Invalid or expired coupon code' });
        }
      },

      removeCoupon: () => set({ couponCode: '', discount: 0, couponError: '' }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getShipping: () => {
        const subtotal = get().getSubtotal();
        return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      },

      getTax: () => {
        const subtotal = get().getSubtotal();
        const discountAmount = (subtotal * get().discount) / 100;
        return Math.round((subtotal - discountAmount) * TAX_RATE);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discountAmount = (subtotal * get().discount) / 100;
        return subtotal - discountAmount + get().getShipping() + get().getTax();
      },
    }),
    {
      name: 'wefton-cart',
      partialize: (state) => ({ items: state.items, couponCode: state.couponCode, discount: state.discount }),
    }
  )
);
