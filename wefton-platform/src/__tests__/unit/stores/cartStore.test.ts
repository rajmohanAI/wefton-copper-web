// ============================================================
// Wefton Copper — Cart Store Unit Tests
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/types';

function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'prod-1',
    title: 'Premium Tee',
    slug: 'premium-tee',
    image: '/images/tee.webp',
    price: 799,
    quantity: 1,
    size: 'M',
    color: 'Navy',
    inventory: 10,
    ...overrides,
  };
}

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false, couponCode: '', discount: 0, couponError: '' });
  });

  describe('addItem', () => {
    it('adds a new item to the cart', () => {
      const item = createCartItem();
      useCartStore.getState().addItem(item);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].productId).toBe('prod-1');
    });

    it('increments quantity for existing item', () => {
      const item = createCartItem({ quantity: 2 });
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(createCartItem({ quantity: 3 }));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('caps quantity at inventory when adding', () => {
      const item = createCartItem({ quantity: 8, inventory: 10 });
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(createCartItem({ quantity: 5, inventory: 10 }));
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it('caps initial quantity at inventory', () => {
      const item = createCartItem({ quantity: 15, inventory: 10 });
      useCartStore.getState().addItem(item);
      expect(useCartStore.getState().items[0].quantity).toBe(10);
    });

    it('uses variantId as key when present', () => {
      const item1 = createCartItem({ variantId: 'v1', size: 'M' });
      const item2 = createCartItem({ variantId: 'v2', size: 'L' });
      useCartStore.getState().addItem(item1);
      useCartStore.getState().addItem(item2);
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes item by productId', () => {
      useCartStore.getState().addItem(createCartItem());
      useCartStore.getState().removeItem('prod-1');
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes item by variantId', () => {
      useCartStore.getState().addItem(createCartItem({ variantId: 'v1' }));
      useCartStore.getState().addItem(createCartItem({ productId: 'prod-2', variantId: 'v2' }));
      useCartStore.getState().removeItem('prod-1', 'v1');
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].variantId).toBe('v2');
    });
  });

  describe('updateQuantity', () => {
    it('updates quantity for an item', () => {
      useCartStore.getState().addItem(createCartItem());
      useCartStore.getState().updateQuantity('prod-1', 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('caps quantity at inventory', () => {
      useCartStore.getState().addItem(createCartItem({ inventory: 3 }));
      useCartStore.getState().updateQuantity('prod-1', 10);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('removes item when quantity is 0', () => {
      useCartStore.getState().addItem(createCartItem());
      useCartStore.getState().updateQuantity('prod-1', 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes item when quantity is negative', () => {
      useCartStore.getState().addItem(createCartItem());
      useCartStore.getState().updateQuantity('prod-1', -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('clears all items and coupon', () => {
      useCartStore.getState().addItem(createCartItem());
      useCartStore.setState({ couponCode: 'TEST', discount: 10 });
      useCartStore.getState().clearCart();
      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.couponCode).toBe('');
      expect(state.discount).toBe(0);
    });
  });

  describe('openCart / closeCart', () => {
    it('opens the cart', () => {
      useCartStore.getState().openCart();
      expect(useCartStore.getState().isOpen).toBe(true);
    });

    it('closes the cart', () => {
      useCartStore.setState({ isOpen: true });
      useCartStore.getState().closeCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });

  describe('removeCoupon', () => {
    it('removes coupon and resets discount', () => {
      useCartStore.setState({ couponCode: 'WEFTON10', discount: 10 });
      useCartStore.getState().removeCoupon();
      const state = useCartStore.getState();
      expect(state.couponCode).toBe('');
      expect(state.discount).toBe(0);
    });
  });

  describe('getSubtotal', () => {
    it('calculates subtotal correctly', () => {
      useCartStore.getState().addItem(createCartItem({ price: 500, quantity: 2 }));
      useCartStore.getState().addItem(createCartItem({ productId: 'prod-2', price: 300, quantity: 1 }));
      expect(useCartStore.getState().getSubtotal()).toBe(1300);
    });

    it('returns 0 for empty cart', () => {
      expect(useCartStore.getState().getSubtotal()).toBe(0);
    });
  });

  describe('getShipping', () => {
    it('returns 99 when subtotal is below 999', () => {
      useCartStore.getState().addItem(createCartItem({ price: 500, quantity: 1 }));
      expect(useCartStore.getState().getShipping()).toBe(99);
    });

    it('returns 0 when subtotal is 999 or above', () => {
      useCartStore.getState().addItem(createCartItem({ price: 999, quantity: 1 }));
      expect(useCartStore.getState().getShipping()).toBe(0);
    });

    it('returns 99 for empty cart', () => {
      expect(useCartStore.getState().getShipping()).toBe(99);
    });
  });

  describe('getTax', () => {
    it('calculates 5% GST on subtotal minus discount', () => {
      useCartStore.getState().addItem(createCartItem({ price: 1000, quantity: 1 }));
      useCartStore.setState({ discount: 10 }); // 10% off
      // subtotal = 1000, discountAmount = 100, taxable = 900, tax = 45
      expect(useCartStore.getState().getTax()).toBe(45);
    });

    it('calculates tax without discount', () => {
      useCartStore.getState().addItem(createCartItem({ price: 1000, quantity: 1 }));
      // subtotal = 1000, tax = 50
      expect(useCartStore.getState().getTax()).toBe(50);
    });
  });

  describe('getTotal', () => {
    it('calculates total = subtotal - discount + shipping + tax', () => {
      useCartStore.getState().addItem(createCartItem({ price: 1000, quantity: 1 }));
      useCartStore.setState({ discount: 10 });
      // subtotal = 1000, discountAmount = 100, shipping = 0 (1000 >= 999), tax = round(900 * 0.05) = 45
      // total = 1000 - 100 + 0 + 45 = 945
      expect(useCartStore.getState().getTotal()).toBe(945);
    });

    it('includes shipping when below threshold', () => {
      useCartStore.getState().addItem(createCartItem({ price: 500, quantity: 1 }));
      // subtotal = 500, discount = 0, shipping = 99, tax = round(500 * 0.05) = 25
      // total = 500 + 99 + 25 = 624
      expect(useCartStore.getState().getTotal()).toBe(624);
    });
  });
});
