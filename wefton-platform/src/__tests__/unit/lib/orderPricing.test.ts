// ============================================================
// Wefton Copper — Order pricing
// ============================================================
import { describe, expect, it } from 'vitest';
import { computeOrderTotals } from '@/lib/orderPricing';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST, TAX_RATE } from '@/config/brand';

describe('computeOrderTotals', () => {
  it('adds shipping below the free-shipping threshold', () => {
    const t = computeOrderTotals([{ price: 500, quantity: 1 }]);
    expect(t.shipping).toBe(SHIPPING_COST);
    expect(t.taxes).toBe(Math.round(500 * TAX_RATE));
    expect(t.total).toBe(500 + SHIPPING_COST + t.taxes);
  });

  it('applies the percentage discount before tax', () => {
    const t = computeOrderTotals([{ price: FREE_SHIPPING_THRESHOLD, quantity: 2 }], 10);
    const subtotal = FREE_SHIPPING_THRESHOLD * 2;
    expect(t.shipping).toBe(0);
    expect(t.discountAmount).toBe(subtotal * 0.1);
    expect(t.total).toBe(subtotal * 0.9 + Math.round(subtotal * 0.9 * TAX_RATE));
  });
});
