// ============================================================
// Wefton Copper — Coupon rules
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  rewardCouponValidity,
  couponSavings,
  couponWindow,
  couponWindowError,
  formatCouponDiscount,
  formatCouponEnd,
  isPublicCoupon,
  istDayEnd,
  istDayStart,
  pickAvailableCoupons,
  toIstDateInput,
  validateCouponForm,
} from '@/lib/coupons';
import { couponSchema } from '@/lib/schemas';

const form = { code: 'SAVE10', startDate: '2026-11-11', endDate: '2026-11-30', rupees: '', percent: '10' };

describe('coupon dates', () => {
  const coupon = { startsAt: istDayStart('2026-11-11'), expiresAt: istDayEnd('2026-11-30') };

  it('runs from the start of the first day to the end of the last, India time', () => {
    expect(coupon.startsAt).toBe('2026-11-10T18:30:00.000Z');
    expect(coupon.expiresAt).toBe('2026-11-30T18:29:59.999Z');
  });

  it('is scheduled, open, then expired', () => {
    expect(couponWindow(coupon, new Date('2026-11-10T18:29:59Z'))).toBe('scheduled');
    expect(couponWindow(coupon, new Date('2026-11-10T18:30:00Z'))).toBe('open');
    expect(couponWindow(coupon, new Date('2026-11-30T18:29:59Z'))).toBe('open');
    expect(couponWindow(coupon, new Date('2026-11-30T18:30:00Z'))).toBe('expired');
  });

  it('explains why it cannot be used', () => {
    expect(couponWindowError(coupon, new Date('2026-11-01T00:00:00Z'))).toMatch(/not active yet/);
    expect(couponWindowError(coupon, new Date('2026-12-05T00:00:00Z'))).toBe('Coupon has expired');
    expect(couponWindowError(coupon, new Date('2026-11-15T00:00:00Z'))).toBeNull();
  });

  it('treats older coupons with no dates as open', () => {
    expect(couponWindow({ startsAt: undefined, expiresAt: null })).toBe('open');
  });

  it('shows a stored date as the India calendar day', () => {
    expect(toIstDateInput(coupon.startsAt)).toBe('2026-11-11');
    expect(toIstDateInput(coupon.expiresAt)).toBe('2026-11-30');
    expect(toIstDateInput(null)).toBe('');
  });
});

describe('coupon form', () => {
  it('accepts a percentage or a rupee amount', () => {
    expect(validateCouponForm(form)).toBeNull();
    expect(validateCouponForm({ ...form, percent: '', rupees: '100' })).toBeNull();
  });

  it('refuses both, or neither', () => {
    expect(validateCouponForm({ ...form, rupees: '100' })).toMatch(/not both/);
    expect(validateCouponForm({ ...form, percent: '' })).toMatch(/rupee discount or a percentage/);
  });

  it('allows letters and numbers only in the ID', () => {
    expect(validateCouponForm({ ...form, code: 'save10' })).toBeNull();
    expect(validateCouponForm({ ...form, code: 'SAVE-10' })).toMatch(/letters and numbers/);
    expect(validateCouponForm({ ...form, code: '' })).toMatch(/required/);
  });

  it('needs both dates, in order', () => {
    expect(validateCouponForm({ ...form, startDate: '' })).toMatch(/Start date/);
    expect(validateCouponForm({ ...form, endDate: '' })).toMatch(/End date/);
    expect(validateCouponForm({ ...form, endDate: '2026-11-01' })).toMatch(/before the start/);
  });

  it('checks the number ranges', () => {
    expect(validateCouponForm({ ...form, percent: '101' })).toMatch(/1 to 100/);
    expect(validateCouponForm({ ...form, percent: '', rupees: '0' })).toMatch(/at least 1/);
  });

  it('formats the discount', () => {
    expect(formatCouponDiscount({ discount: 10, discountFlat: 0 })).toBe('10%');
    expect(formatCouponDiscount({ discount: 0, discountFlat: 100 })).toBe('₹100');
  });
});

describe('coupon schema', () => {
  const base = { code: 'save10', active: true, startsAt: null, expiresAt: null };

  it('stores the code in upper case', () => {
    expect(couponSchema.parse({ ...base, discount: 10 }).code).toBe('SAVE10');
  });

  it('needs exactly one kind of discount', () => {
    expect(couponSchema.safeParse({ ...base, discount: 10, discountFlat: 0 }).success).toBe(true);
    expect(couponSchema.safeParse({ ...base, discount: 0, discountFlat: 100 }).success).toBe(true);
    expect(couponSchema.safeParse({ ...base, discount: 10, discountFlat: 100 }).success).toBe(false);
    expect(couponSchema.safeParse({ ...base, discount: 0, discountFlat: 0 }).success).toBe(false);
  });
});

describe('coupon flag', () => {
  it('lists only coupons flagged S', () => {
    expect(isPublicCoupon({ flag: 'S' })).toBe(true);
    expect(isPublicCoupon({ flag: 'A' })).toBe(false);
    expect(isPublicCoupon({})).toBe(false);
  });
});

describe('coupons shown at checkout', () => {
  const now = new Date('2026-11-15T06:00:00Z');
  const base = { active: true, flag: 'S' as const, startsAt: istDayStart('2026-11-11'), expiresAt: istDayEnd('2026-11-30') };
  const cart = [{ price: 1000, quantity: 2 }];

  it('lists only enabled, public coupons inside their dates', () => {
    const coupons = [
      { ...base, code: 'OPEN', discount: 10 },
      { ...base, code: 'PRIVATE', discount: 10, flag: 'A' as const },
      { ...base, code: 'NOFLAG', discount: 10, flag: undefined },
      { ...base, code: 'OFF', discount: 10, active: false },
      { ...base, code: 'LATER', discount: 10, startsAt: istDayStart('2026-12-01') },
      { ...base, code: 'GONE', discount: 10, expiresAt: istDayEnd('2026-11-14') },
    ];
    expect(pickAvailableCoupons(coupons, cart, now).map((c) => c.code)).toEqual(['OPEN']);
  });

  it('puts the biggest saving on this cart first', () => {
    const coupons = [
      { ...base, code: 'FLAT150', discount: 0, discountFlat: 150 },
      { ...base, code: 'PCT10', discount: 10 },
      { ...base, code: 'FLAT100', discount: 0, discountFlat: 100 },
    ];
    expect(pickAvailableCoupons(coupons, cart, now).map((c) => c.code)).toEqual(['PCT10', 'FLAT150', 'FLAT100']);
  });

  it('works out the saving, never more than the cart', () => {
    expect(couponSavings({ discount: 10 }, cart)).toBe(200);
    expect(couponSavings({ discount: 0, discountFlat: 5000 }, cart)).toBe(2000);
  });

  it('shows the last day in India time', () => {
    expect(formatCouponEnd(istDayEnd('2026-11-30'))).toBe('Valid till 30 Nov');
    expect(formatCouponEnd(null)).toBeNull();
  });
});

describe('rewardCouponValidity', () => {
  const reward = { startsAt: '2026-11-14T04:20:00Z', expiresAt: '2026-12-13T04:20:00Z' };
  it('shows the window in India time', () => {
    expect(rewardCouponValidity(reward, new Date('2026-11-13T04:20:00Z'))).toBe('Valid from 14 Nov, 9:50 am till 13 Dec, 9:50 am');
  });
  it('says when it has expired', () => {
    expect(rewardCouponValidity(reward, new Date('2026-12-14T00:00:00Z'))).toBe('Expired on 13 Dec, 9:50 am');
  });
});
