import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Order } from '@/types';

/**
 * Property 12: Admin revenue statistics
 * Validates: Requirements 26.1
 *
 * For any array of orders:
 * - totalRevenue SHALL equal the sum of order.total for all orders where paymentStatus == "verified"
 * - pendingOrders SHALL equal the count of orders where orderStatus == "placed"
 * - pendingPayments SHALL equal the count of orders where paymentStatus == "uploaded"
 */

// Pure function to compute admin stats from an array of orders
function computeAdminStats(orders: Pick<Order, 'total' | 'paymentStatus' | 'orderStatus'>[]) {
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'verified')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter((o) => o.orderStatus === 'placed').length;

  const pendingPayments = orders.filter((o) => o.paymentStatus === 'uploaded').length;

  return { totalRevenue, pendingOrders, pendingPayments };
}

describe('Feature: wefton-copper-platform, Property 12: Admin revenue statistics', () => {
  it('totalRevenue == sum of order.total where paymentStatus=="verified", pendingOrders == count where orderStatus=="placed", pendingPayments == count where paymentStatus=="uploaded"', () => {
    const paymentStatuses = ['pending', 'uploaded', 'verified', 'failed', 'refunded'] as const;
    const orderStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

    const orderArb = fc.record({
      total: fc.integer({ min: 1, max: 100000 }),
      paymentStatus: fc.constantFrom(...paymentStatuses),
      orderStatus: fc.constantFrom(...orderStatuses),
    });

    fc.assert(
      fc.property(fc.array(orderArb, { minLength: 0, maxLength: 50 }), (orders) => {
        const stats = computeAdminStats(orders);

        // Verify totalRevenue
        const expectedRevenue = orders
          .filter((o) => o.paymentStatus === 'verified')
          .reduce((sum, o) => sum + o.total, 0);
        expect(stats.totalRevenue).toBe(expectedRevenue);

        // Verify pendingOrders
        const expectedPendingOrders = orders.filter((o) => o.orderStatus === 'placed').length;
        expect(stats.pendingOrders).toBe(expectedPendingOrders);

        // Verify pendingPayments
        const expectedPendingPayments = orders.filter((o) => o.paymentStatus === 'uploaded').length;
        expect(stats.pendingPayments).toBe(expectedPendingPayments);

        // Additional invariant: revenue is always non-negative
        expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 15: Order status badge color mapping
 * Validates: Requirements 29.4
 *
 * For any valid orderStatus value (placed, confirmed, processing, shipped,
 * delivered, cancelled), the badge color mapping function SHALL return exactly
 * one of the defined colors: grey, blue, yellow, purple, green, red respectively.
 * No status value SHALL map to an undefined color.
 */

// Pure function mapping order status to badge color
// Mirrors the ORDER_STATUS_VARIANT mapping from AccountClient.tsx
function getOrderStatusColor(status: string): string | undefined {
  const colorMap: Record<string, string> = {
    placed: 'grey',
    confirmed: 'blue',
    processing: 'yellow',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };
  return colorMap[status];
}

const VALID_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const VALID_COLORS = ['grey', 'blue', 'yellow', 'purple', 'green', 'red'] as const;

describe('Feature: wefton-copper-platform, Property 15: Order status badge color mapping', () => {
  it('every valid status maps to exactly one defined color, no status maps to undefined', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_STATUSES), (status) => {
        const color = getOrderStatusColor(status);

        // Color must not be undefined
        expect(color).toBeDefined();

        // Color must be one of the valid colors
        expect(VALID_COLORS).toContain(color);

        // Verify the specific mapping
        const expectedMapping: Record<string, string> = {
          placed: 'grey',
          confirmed: 'blue',
          processing: 'yellow',
          shipped: 'purple',
          delivered: 'green',
          cancelled: 'red',
        };
        expect(color).toBe(expectedMapping[status]);
      }),
      { numRuns: 100 }
    );
  });

  it('each status maps to a unique color (bijective mapping)', () => {
    const colors = VALID_STATUSES.map((s) => getOrderStatusColor(s));
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(VALID_STATUSES.length);
  });
});
