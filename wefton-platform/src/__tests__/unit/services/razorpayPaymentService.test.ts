// ============================================================
// Wefton Copper — Razorpay payment flow
// The Razorpay SDK and Firestore are mocked: no request leaves the test.
// ============================================================
import { createHmac } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeOrderTotals } from '@/lib/orderPricing';

const ordersCreate = vi.fn();
vi.mock('razorpay', () => ({
  default: vi.fn(function Razorpay() {
    return { orders: { create: ordersCreate } };
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

// ── Minimal in-memory Firestore ─────────────────────────────
type Doc = Record<string, unknown>;
let store: Record<string, Record<string, Doc>>;

function fakeDb() {
  return {
    collection(name: string) {
      const col = () => (store[name] ??= {});
      const docRef = (id: string) => ({
        id,
        get: async () => ({ exists: id in col(), data: () => col()[id] }),
        update: async (patch: Doc) => {
          col()[id] = { ...col()[id], ...patch };
        },
      });
      const makeQuery = (filters: [string, unknown][]) => ({
        where: (field: string, _op: string, value: unknown) =>
          makeQuery([...filters, [field, value]]),
        limit: () => makeQuery(filters),
        get: async () => {
          const docs = Object.entries(col())
            .filter(([, d]) => filters.every(([f, v]) => d[f] === v))
            .map(([id, d]) => ({ ref: docRef(id), data: () => d }));
          return { empty: docs.length === 0, docs };
        },
      });
      return { doc: docRef, ...makeQuery([]) };
    },
  };
}

vi.mock('@/lib/firebaseAdmin', () => ({ getAdminDb: () => fakeDb() }));

import {
  PaymentError,
  confirmRazorpayPayment,
  prepareRazorpayOrder,
} from '@/services/razorpayPaymentService';

const SECRET = 'test_secret_not_real';
const UID = 'user-1';
const ORDER_ID = 'WC-ORDER-1';

function seed(orderOverrides: Doc = {}) {
  const lines = [
    { productId: 'p1', price: 800, quantity: 1, size: 'M', variantId: 'p1-m' },
    { productId: 'p2', price: 500, quantity: 2, size: '', variantId: '' },
  ];
  const total = computeOrderTotals(lines, 10).total;
  store = {
    products: {
      p1: { price: 750, variants: [{ variantId: 'p1-m', size: 'M', price: 800, inventory: 3 }] },
      p2: { price: 500, variants: [] },
    },
    coupons: { c1: { code: 'SAVE10', discount: 10, active: true, expiresAt: null } },
    orders: {
      doc1: {
        orderId: ORDER_ID,
        userId: UID,
        products: lines,
        couponCode: 'SAVE10',
        total,
        paymentStatus: 'pending',
        orderStatus: 'placed',
        ...orderOverrides,
      },
    },
  };
  return total;
}

function sign(orderId: string, paymentId: string) {
  return createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

async function expectPaymentError(p: Promise<unknown>, status: number) {
  const err = await p.catch((e) => e);
  expect(err).toBeInstanceOf(PaymentError);
  expect((err as PaymentError).status).toBe(status);
}

beforeEach(() => {
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_key');
  vi.stubEnv('RAZORPAY_KEY_SECRET', SECRET);
  ordersCreate.mockReset();
  ordersCreate.mockResolvedValue({ id: 'order_rzp_1' });
});

afterEach(() => vi.unstubAllEnvs());

describe('prepareRazorpayOrder', () => {
  it('creates a Razorpay order for the catalog-priced total and stores its id', async () => {
    const total = seed();
    const result = await prepareRazorpayOrder(UID, ORDER_ID);

    expect(ordersCreate).toHaveBeenCalledWith({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: ORDER_ID,
      notes: { orderId: ORDER_ID, userId: UID },
    });
    expect(result).toEqual({
      keyId: 'rzp_test_key',
      orderId: ORDER_ID,
      razorpayOrderId: 'order_rzp_1',
      amount: Math.round(total * 100),
      currency: 'INR',
    });
    expect(store.orders.doc1.razorpayOrderId).toBe('order_rzp_1');
    expect(result).not.toHaveProperty('keySecret');
  });

  it('reuses the existing Razorpay order on retry', async () => {
    seed();
    await prepareRazorpayOrder(UID, ORDER_ID);
    await prepareRazorpayOrder(UID, ORDER_ID);
    expect(ordersCreate).toHaveBeenCalledTimes(1);
  });

  it('refuses when the stored total does not match catalog prices', async () => {
    seed({ total: 1 });
    await expectPaymentError(prepareRazorpayOrder(UID, ORDER_ID), 409);
    expect(ordersCreate).not.toHaveBeenCalled();
  });

  it('ignores an expired coupon when re-pricing', async () => {
    seed();
    store.coupons.c1.expiresAt = '2000-01-01T00:00:00Z';
    await expectPaymentError(prepareRazorpayOrder(UID, ORDER_ID), 409);
  });

  it("refuses another user's order", async () => {
    seed();
    await expectPaymentError(prepareRazorpayOrder('someone-else', ORDER_ID), 404);
  });

  it('refuses an order that is not awaiting payment', async () => {
    seed({ paymentStatus: 'verified' });
    await expectPaymentError(prepareRazorpayOrder(UID, ORDER_ID), 409);
  });

  it('returns 503 when keys are not configured', async () => {
    seed();
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    await expectPaymentError(prepareRazorpayOrder(UID, ORDER_ID), 503);
    expect(ordersCreate).not.toHaveBeenCalled();
  });
});

describe('confirmRazorpayPayment', () => {
  it('marks the order paid when the signature is valid', async () => {
    seed({ razorpayOrderId: 'order_rzp_1' });
    await confirmRazorpayPayment(UID, ORDER_ID, {
      razorpay_order_id: 'order_rzp_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: sign('order_rzp_1', 'pay_1'),
    });
    expect(store.orders.doc1).toMatchObject({
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      paymentMethod: 'razorpay',
      paymentReference: 'pay_1',
      razorpayPaymentId: 'pay_1',
    });
  });

  it('rejects a forged signature and leaves the order unpaid', async () => {
    seed({ razorpayOrderId: 'order_rzp_1' });
    await expectPaymentError(
      confirmRazorpayPayment(UID, ORDER_ID, {
        razorpay_order_id: 'order_rzp_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'f'.repeat(64),
      }),
      400
    );
    expect(store.orders.doc1.paymentStatus).toBe('pending');
  });

  it('rejects a payment made against a different Razorpay order', async () => {
    seed({ razorpayOrderId: 'order_rzp_1' });
    await expectPaymentError(
      confirmRazorpayPayment(UID, ORDER_ID, {
        razorpay_order_id: 'order_rzp_other',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: sign('order_rzp_other', 'pay_1'),
      }),
      400
    );
    expect(store.orders.doc1.paymentStatus).toBe('pending');
  });
});
