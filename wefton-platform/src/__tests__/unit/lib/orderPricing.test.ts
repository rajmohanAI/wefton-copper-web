// ============================================================
// Wefton Copper — Order pricing
// ============================================================
import { describe, expect, it } from 'vitest';
import { computeOrderTotals } from '@/lib/orderPricing';

describe('computeOrderTotals', () => {
  it('charges no delivery on any order', () => {
    expect(computeOrderTotals([{ price: 100, quantity: 1 }]).shipping).toBe(0);
    expect(computeOrderTotals([{ price: 689, quantity: 3 }]).shipping).toBe(0);
  });

  it('adds no GST on top, since prices include it', () => {
    const t = computeOrderTotals([{ price: 689, quantity: 2 }]);
    expect(t.taxes).toBe(0);
    expect(t.total).toBe(1378);
  });

  it('applies the percentage discount', () => {
    const t = computeOrderTotals([{ price: 689, quantity: 2 }], 10);
    expect(t.discountAmount).toBeCloseTo(137.8);
    expect(t.total).toBeCloseTo(1240.2);
  });
});
