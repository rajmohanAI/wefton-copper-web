// ============================================================
// Wefton Copper — Cart Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';
import { computeOrderTotals } from '@/lib/orderPricing';
import { validateCoupon } from '@/services/couponService';
import { trackAddToCart } from '@/lib/analytics';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  discount: number;
  /** Fixed rupees off from the coupon; 0 when it is a percentage. */
  discountFlat: number;
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
  /** Re-checks the applied coupon; drops it if it is no longer valid. */
  revalidateCoupon: () => Promise<void>;
  getDiscountAmount: () => number;

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
      discountFlat: 0,
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

      clearCart: () => set({ items: [], couponCode: '', discount: 0, discountFlat: 0, couponError: '' }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: async (code: string) => {
        set({ couponError: '' });
        const result = await validateCoupon(code);
        if (result.valid) {
          set({
            couponCode: code.trim().toUpperCase(),
            discount: result.discount ?? 0,
            discountFlat: result.discountFlat ?? 0,
            couponError: '',
          });
        } else {
          set({ couponCode: '', discount: 0, discountFlat: 0, couponError: result.error || 'Invalid or expired coupon code' });
        }
      },

      removeCoupon: () => set({ couponCode: '', discount: 0, discountFlat: 0, couponError: '' }),

      revalidateCoupon: async () => {
        const code = get().couponCode;
        if (code) await get().applyCoupon(code);
      },

      getDiscountAmount: () => computeOrderTotals(get().items, get().discount, get().discountFlat).discountAmount,

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getShipping: () => computeOrderTotals(get().items, get().discount, get().discountFlat).shipping,

      getTax: () => computeOrderTotals(get().items, get().discount, get().discountFlat).taxes,

      getTotal: () => computeOrderTotals(get().items, get().discount, get().discountFlat).total,
    }),
    {
      name: 'wefton-cart',
      partialize: (state) => ({ items: state.items, couponCode: state.couponCode, discount: state.discount, discountFlat: state.discountFlat }),
    }
  )
);
