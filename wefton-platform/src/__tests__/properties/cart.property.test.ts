// ============================================================
// Wefton Copper — Cart Property-Based Tests
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useCartStore } from '@/store/cartStore';
import { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, TAX_RATE } from '@/config/brand';
import type { CartItem } from '@/types';

// Reset store state between tests
beforeEach(() => {
  useCartStore.setState({
    items: [],
    isOpen: false,
    couponCode: '',
    discount: 0,
    couponError: '',
  });
});

describe('Feature: wefton-copper-platform, Property 1: Cart arithmetic invariant', () => {
  /**
   * **Validates: Requirements 19.6, 23.3**
   *
   * For any set of cart items and discount percentage, the computed total
   * must equal: subtotal - discountAmount + shipping + tax
   */
  it('Property 1: total == subtotal - discountAmount + shipping + tax for any items and discount', () => {
    const cartItemArb = fc.record({
      price: fc.integer({ min: 1, max: 100000 }),
      quantity: fc.integer({ min: 1, max: 50 }),
    });

    const discountArb = fc.integer({ min: 0, max: 100 });

    fc.assert(
      fc.property(
        fc.array(cartItemArb, { minLength: 1, maxLength: 20 }),
        discountArb,
        (items, discount) => {
          // Compute expected values using the same logic as the store
          const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const discountAmount = (subtotal * discount) / 100;
          const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
          const tax = Math.round((subtotal - discountAmount) * TAX_RATE);
          const expectedTotal = subtotal - discountAmount + shipping + tax;

          // Set up the store with these items
          const cartItems: CartItem[] = items.map((item, idx) => ({
            productId: `product-${idx}`,
            title: `Product ${idx}`,
            slug: `product-${idx}`,
            image: '/img.jpg',
            price: item.price,
            quantity: item.quantity,
            inventory: item.quantity + 10, // ensure inventory > quantity
          }));

          useCartStore.setState({ items: cartItems, discount });

          const store = useCartStore.getState();
          const actualSubtotal = store.getSubtotal();
          const actualShipping = store.getShipping();
          const actualTax = store.getTax();
          const actualTotal = store.getTotal();

          expect(actualSubtotal).toBe(subtotal);
          expect(actualShipping).toBe(shipping);
          expect(actualTax).toBe(tax);
          expect(actualTotal).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: wefton-copper-platform, Property 2: Cart quantity never exceeds inventory', () => {
  /**
   * **Validates: Requirements 19.3, 12.2**
   *
   * After any sequence of addItem/updateQuantity operations,
   * the item quantity in the cart never exceeds its inventory.
   */
  it('Property 2: quantity <= inventory after any sequence of addItem/updateQuantity operations', () => {
    const inventoryArb = fc.integer({ min: 1, max: 100 });

    // Generate a sequence of operations: addItem with some quantity, or updateQuantity with some value
    const operationArb = fc.oneof(
      fc.record({
        type: fc.constant('add' as const),
        quantity: fc.integer({ min: 1, max: 200 }),
      }),
      fc.record({
        type: fc.constant('update' as const),
        quantity: fc.integer({ min: 1, max: 200 }),
      })
    );

    fc.assert(
      fc.property(
        inventoryArb,
        fc.array(operationArb, { minLength: 1, maxLength: 20 }),
        (inventory, operations) => {
          // Reset store
          useCartStore.setState({ items: [], discount: 0, couponCode: '', couponError: '' });

          const productId = 'test-product';
          const baseItem: CartItem = {
            productId,
            title: 'Test Product',
            slug: 'test-product',
            image: '/img.jpg',
            price: 500,
            quantity: 0, // will be set per operation
            inventory,
          };

          for (const op of operations) {
            if (op.type === 'add') {
              useCartStore.getState().addItem({ ...baseItem, quantity: op.quantity });
            } else {
              useCartStore.getState().updateQuantity(productId, op.quantity);
            }
          }

          const state = useCartStore.getState();
          const item = state.items.find((i) => i.productId === productId);

          if (item) {
            expect(item.quantity).toBeLessThanOrEqual(inventory);
            expect(item.quantity).toBeGreaterThan(0);
          }
          // If item is not in cart (e.g., updateQuantity with 0 removes it), that's also valid
        }
      ),
      { numRuns: 100 }
    );
  });
});
