// ============================================================
// Wefton Copper — Scratch card coupons: issue, redeem, invalidate
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

import { invalidateRewardCoupon, issueRewardCoupon, redeemScratchCoupon } from '@/services/scratchCouponServer';
import { checkCouponCode } from '@/services/couponServer';
import {
  couponUseError,
  generateScratchCode,
  scratchCouponDates,
} from '@/lib/coupons';

type Data = Record<string, unknown>;
const store = new Map<string, Data>();

function docRef(path: string) {
  return {
    path,
    get: async () => {
      const data = store.get(path);
      return { exists: !!data, data: () => data, get: (k: string) => data?.[k] };
    },
    update: async (u: Data) => void store.set(path, { ...store.get(path), ...u }),
  };
}

const db = {
  doc: (path: string) => docRef(path),
  collection: (name: string) => {
    const filters: [string, unknown][] = [];
    const q = {
      doc: (id: string) => docRef(`${name}/${id}`),
      where: (field: string, _op: string, value: unknown) => {
        filters.push([field, value]);
        return q;
      },
      limit: () => q,
      get: async () => {
        const docs = [...store.entries()]
          .filter(([p]) => p.startsWith(`${name}/`))
          .filter(([, d]) => filters.every(([f, v]) => d[f] === v))
          .map(([, d]) => ({ data: () => d }));
        return { empty: docs.length === 0, docs };
      },
    };
    return q;
  },
  runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      get: (ref: { get: () => unknown }) => ref.get(),
      update: (ref: { path: string }, u: Data) => store.set(ref.path, { ...store.get(ref.path), ...u }),
      create: (ref: { path: string }, d: Data) => {
        if (store.has(ref.path)) throw new Error('exists');
        store.set(ref.path, d);
      },
    }),
} as never;

const NOW = new Date('2026-11-12T10:00:00Z');
const HOUR = 3600_000;
let seq = 0;
const random = (n: number) => (seq++ * 7) % n;

beforeEach(() => {
  store.clear();
  seq = 0;
  store.set('orders/A', { orderId: 'WC-A', userId: 'u1', orderStatus: 'placed', placedAt: NOW.toISOString() });
});

describe('scratch code and dates', () => {
  it('is 16 upper-case letters and digits', () => {
    const code = generateScratchCode((n) => Math.floor(Math.random() * n));
    expect(code).toMatch(/^[A-Z0-9]{16}$/);
  });

  it('starts 24 hours after issue and ends 30 days after issue', () => {
    const { startsAt, expiresAt } = scratchCouponDates(NOW);
    expect(new Date(startsAt).getTime() - NOW.getTime()).toBe(24 * HOUR);
    expect(new Date(expiresAt).getTime() - NOW.getTime()).toBe(30 * 24 * HOUR);
  });
});

describe('issueRewardCoupon', () => {
  it('issues one private coupon per order, not tied to the customer', async () => {
    const reward = await issueRewardCoupon(db, docRef('orders/A') as never, NOW, random);
    expect(reward?.code).toMatch(/^[A-Z0-9]{16}$/);
    expect(reward?.label).toBe('₹100');
    const coupon = store.get(`coupons/${reward!.code}`)!;
    expect(coupon).toMatchObject({ code: reward!.code, flag: 'A', active: true, source: 'scratch', sourceOrderId: 'WC-A', discount: 0, discountFlat: 100 });
    expect(coupon).not.toHaveProperty('userId');
    expect((store.get('orders/A')!.rewardCoupon as { code: string }).code).toBe(reward!.code);

    const again = await issueRewardCoupon(db, docRef('orders/A') as never, new Date(NOW.getTime() + HOUR), random);
    expect(again?.code).toBe(reward!.code);
    expect([...store.keys()].filter((k) => k.startsWith('coupons/'))).toHaveLength(1);
  });

  it('issues nothing for unplaced or cancelled orders', async () => {
    store.set('orders/B', { orderId: 'WC-B', orderStatus: 'placed' });
    store.set('orders/C', { orderId: 'WC-C', orderStatus: 'cancelled', placedAt: NOW.toISOString() });
    expect(await issueRewardCoupon(db, docRef('orders/B') as never, NOW, random)).toBeNull();
    expect(await issueRewardCoupon(db, docRef('orders/C') as never, NOW, random)).toBeNull();
  });
});

describe('using a scratch coupon', () => {
  it('works only after 24 hours, only once, and not after 30 days', async () => {
    const reward = (await issueRewardCoupon(db, docRef('orders/A') as never, NOW, random))!;
    const coupon = () => store.get(`coupons/${reward.code}`) as never;

    expect(couponUseError(coupon(), new Date(NOW.getTime() + 23 * HOUR))).toBe('This coupon is not active yet');
    expect(couponUseError(coupon(), new Date(NOW.getTime() + 25 * HOUR))).toBeNull();
    expect(couponUseError(coupon(), new Date(NOW.getTime() + 31 * 24 * HOUR))).toBe('Coupon has expired');

    await redeemScratchCoupon(db, { orderId: 'WC-NEXT', couponCode: reward.code.toLowerCase() }, new Date(NOW.getTime() + 25 * HOUR));
    expect(store.get(`coupons/${reward.code}`)).toMatchObject({ usedByOrderId: 'WC-NEXT' });
    expect(couponUseError(coupon(), new Date(NOW.getTime() + 26 * HOUR))).toBe('This coupon has already been used');

    // A second order can't take it over.
    await redeemScratchCoupon(db, { orderId: 'WC-OTHER', couponCode: reward.code });
    expect(store.get(`coupons/${reward.code}`)).toMatchObject({ usedByOrderId: 'WC-NEXT' });
  });

  it('is switched off when the order that earned it is cancelled', async () => {
    const reward = (await issueRewardCoupon(db, docRef('orders/A') as never, NOW, random))!;
    await invalidateRewardCoupon(db, { rewardCoupon: reward }, NOW);
    expect(store.get(`coupons/${reward.code}`)).toMatchObject({ active: false, invalidatedAt: NOW.toISOString() });
    expect(await checkCouponCode(db, reward.code)).toEqual({ valid: false, error: 'Invalid coupon code' });
  });

  it('leaves Offers coupons alone when they are used', async () => {
    store.set('coupons/xyz', { code: 'SUMMER25', discount: 25, active: true, expiresAt: null });
    await redeemScratchCoupon(db, { orderId: 'WC-NEXT', couponCode: 'xyz' });
    expect(store.get('coupons/xyz')).not.toHaveProperty('usedAt');
  });
});
