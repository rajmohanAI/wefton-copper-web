// ============================================================
// Wefton Copper — Coupon Validation Property-Based Tests
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Firebase before importing the service
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

import { validateCoupon } from '@/services/couponService';
import { getDocs } from 'firebase/firestore';

const mockedGetDocs = vi.mocked(getDocs);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Feature: wefton-copper-platform, Property 4: Coupon validation logic', () => {
  /**
   * **Validates: Requirements 20.2, 20.3**
   *
   * - Valid coupon (active, not expired) → { valid: true, discount: N }
   * - Invalid coupon (not found) → { valid: false, error: "Invalid coupon code" }
   * - Expired coupon → { valid: false, error: "Coupon has expired" }
   */
  it('Property 4: valid active non-expired coupon returns { valid: true, discount }', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 100 }),
        async (code, discount) => {
          // Mock a valid, active, non-expired coupon
          const futureDate = new Date(Date.now() + 86400000); // 1 day in future
          mockedGetDocs.mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                data: () => ({
                  code: code.toUpperCase(),
                  discount,
                  active: true,
                  expiresAt: { toDate: () => futureDate },
                }),
              },
            ],
          } as never);

          const result = await validateCoupon(code);
          expect(result.valid).toBe(true);
          expect(result.discount).toBe(discount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: non-existent coupon code returns { valid: false }', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (code) => {
          // Mock empty result (coupon not found)
          mockedGetDocs.mockResolvedValueOnce({
            empty: true,
            docs: [],
          } as never);

          const result = await validateCoupon(code);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Invalid coupon code');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: expired coupon returns { valid: false, error: "Coupon has expired" }', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 100 }),
        async (code, discount) => {
          // Mock an expired coupon (expiresAt in the past)
          const pastDate = new Date(Date.now() - 86400000); // 1 day in past
          mockedGetDocs.mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                data: () => ({
                  code: code.toUpperCase(),
                  discount,
                  active: true,
                  expiresAt: { toDate: () => pastDate },
                }),
              },
            ],
          } as never);

          const result = await validateCoupon(code);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Coupon has expired');
        }
      ),
      { numRuns: 100 }
    );
  });
});
