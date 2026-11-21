// ============================================================
// Wefton Copper — Order lifecycle: placed emails, reminders, wait-or-cancel
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    arrayUnion: (...items: unknown[]) => ({ __arrayUnion: items }),
    serverTimestamp: () => 'SERVER_TS',
  },
}));
vi.mock('@/lib/firebaseAdmin', () => ({
  getAdminAuth: () => ({ getUser: async () => ({ email: 'buyer@example.com' }) }),
}));

import { runDailyOrderChecks, markOrderPlaced, istDate, respondToOrderChoice, shouldAskChoice } from '@/services/orderLifecycleServer';
import { orderChoiceToken, verifyOrderChoiceToken } from '@/lib/orderResponse';
import type { Order } from '@/types';

// ── Minimal in-memory Firestore ───────────────────────────────
type Data = Record<string, unknown>;
const store = new Map<string, Data>();

function applyUpdate(path: string, updates: Data) {
  const current = { ...(store.get(path) ?? {}) };
  for (const [key, value] of Object.entries(updates)) {
    if (value && typeof value === 'object' && '__arrayUnion' in (value as Data)) {
      current[key] = [...((current[key] as unknown[]) ?? []), ...(value as { __arrayUnion: unknown[] }).__arrayUnion];
    } else if (key.includes('.')) {
      const [a, b] = key.split('.');
      current[a] = { ...((current[a] as Data) ?? {}), [b]: value };
    } else {
      current[key] = value;
    }
  }
  store.set(path, current);
}

function docRef(path: string) {
  return {
    path,
    id: path.split('/').pop(),
    get: async () => {
      const data = store.get(path);
      return { exists: !!data, data: () => data, get: (k: string) => data?.[k], ref: docRef(path) };
    },
    update: async (u: Data) => applyUpdate(path, u),
    set: async (d: Data) => applyUpdate(path, d),
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
          .filter(([p]) => p.startsWith(`${name}/`) && p.split('/').length === 2)
          .filter(([, d]) => filters.every(([f, v]) => d[f] === v))
          .map(([p, d]) => ({ ref: docRef(p), data: () => d, get: (k: string) => d[k] }));
        return { empty: docs.length === 0, docs };
      },
    };
    return q;
  },
  runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({ get: (ref: { get: () => unknown }) => ref.get(), update: (ref: { path: string }, u: Data) => applyUpdate(ref.path, u) }),
} as never;

const NOW = new Date('2026-11-20T04:30:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

function order(id: string, extra: Partial<Order>): void {
  store.set(`orders/${id}`, {
    orderId: id,
    userId: 'u1',
    lifecycleVersion: 1,
    products: [{ productId: 'p1', title: 'Crew Neck', image: '', price: 799, quantity: 2, size: 'M', color: 'Olive Green' }],
    subtotal: 1598,
    shipping: 0,
    taxes: 80,
    total: 1678,
    paymentStatus: 'verified',
    orderStatus: 'confirmed',
    shippingAddress: { name: 'Asha', phone: '9999999999', line1: 'x', city: 'Chennai', state: 'TN', pincode: '600001', country: 'India' },
    customerEmail: 'asha@example.com',
    ...extra,
  });
}

const send = vi.fn(async () => ({ sent: true }));
const sentSubjects = () => (send.mock.calls as unknown as [{ subject: string; to: unknown }][]).map(([e]) => e.subject);

beforeEach(() => {
  process.env.ORDER_LINK_SECRET = 'test-secret';
  store.clear();
  send.mockClear();
  store.set('products/p1', {
    productCode: 'WCPM001',
    sku: 'WCP001M',
    variants: [{ variantId: 'v1', size: 'M', color: 'Olive Green', sku: 'WCP001M0103', inventory: 5 }],
  });
});

describe('markOrderPlaced', () => {
  it('stamps the order once, with Product ID and SKU on each line', async () => {
    order('A', { customerEmail: '' });
    const placed = await markOrderPlaced(db, docRef('orders/A') as never, NOW);
    expect(placed?.placedAt).toBe(NOW.toISOString());
    const stored = store.get('orders/A')!;
    expect(stored.customerEmail).toBe('buyer@example.com');
    expect(stored.itemCount).toBe(2);
    expect((stored.products as { productCode: string; sku: string }[])[0]).toMatchObject({ productCode: 'WCPM001', sku: 'WCP001M0103' });
    await markOrderPlaced(db, docRef('orders/A') as never, new Date(NOW.getTime() + 1000));
    expect(store.get('orders/A')!.placedAt).toBe(NOW.toISOString());
  });

  it('takes the ordered variant out of stock exactly once', async () => {
    store.set('products/p1', { ...store.get('products/p1'), inventory: 80, variants: [
      { variantId: 'v1', size: 'M', color: 'Olive Green', sku: 'WCP001M0103', inventory: 5 },
      { variantId: 'v2', size: 'L', color: 'Olive Green', inventory: 5 },
    ] });
    order('S', {});
    await markOrderPlaced(db, docRef('orders/S') as never, NOW);
    await markOrderPlaced(db, docRef('orders/S') as never, NOW);
    await runDailyOrderChecks(db, NOW, send);
    const product = store.get('products/p1')!;
    expect(product.inventory).toBe(78);
    expect((product.variants as { inventory: number }[]).map((v) => v.inventory)).toEqual([3, 5]);
    expect(store.get('orders/S')!.stockDeductedAt).toBe(NOW.toISOString());
    expect(store.get('orders/S')!.stockMoves).toEqual([
      { productId: 'p1', variantId: 'v1', size: 'M', color: 'Olive Green', quantity: 2 },
    ]);
  });

  it('ignores unpaid and older orders', async () => {
    order('B', { paymentStatus: 'pending' });
    order('C', { lifecycleVersion: undefined });
    expect(await markOrderPlaced(db, docRef('orders/B') as never, NOW)).toBeNull();
    expect(await markOrderPlaced(db, docRef('orders/C') as never, NOW)).toBeNull();
  });
});

describe('runDailyOrderChecks', () => {
  const sentFlags = { placedSentAt: 'x', confirmationSentAt: 'x' };

  it('sends placed emails for paid orders the browser never reported', async () => {
    order('A', {});
    const result = await runDailyOrderChecks(db, NOW, send);
    expect(result.placed).toBe(1);
    expect(sentSubjects().some((s) => s.startsWith('New order #A'))).toBe(true);
    expect(sentSubjects().some((s) => s.startsWith('Order confirmed'))).toBe(true);
  });

  it('reminds the shop daily from day 5 and apologises to the customer once', async () => {
    order('A', { placedAt: daysAgo(6), statusUpdatedAt: daysAgo(6), notifications: sentFlags });
    const first = await runDailyOrderChecks(db, NOW, send);
    expect(first).toMatchObject({ overdue: 1, delayEmails: 1, digestSent: true, choiceEmails: 0 });
    expect(sentSubjects()).toHaveLength(2);

    // Same day again: no repeat digest, no second apology.
    send.mockClear();
    await runDailyOrderChecks(db, new Date(NOW.getTime() + 3600000), send);
    expect(send).not.toHaveBeenCalled();

    // Next day: digest again, still no second apology.
    await runDailyOrderChecks(db, new Date(NOW.getTime() + 86400000), send);
    expect(sentSubjects()).toEqual([expect.stringContaining('[Action needed]')]);
  });

  it('asks the customer to wait or cancel on day 10, once, and never cancels by itself', async () => {
    order('A', { placedAt: daysAgo(10), statusUpdatedAt: daysAgo(10), notifications: { ...sentFlags, delaySentAt: 'x' } });
    const result = await runDailyOrderChecks(db, NOW, send);
    expect(result.choiceEmails).toBe(1);
    const choice = (send.mock.calls as unknown as [{ subject: string; html: string; to: string }][]).find(([e]) => e.subject.startsWith('An update on your order'))![0];
    expect(choice.to).toBe('asha@example.com');
    expect(choice.html).toContain('/order-response?t=');
    expect(choice.html).toContain('choice=wait');
    expect(choice.html).toContain('choice=cancel');
    expect(choice.html).toContain('₹1,678');
    const stored = store.get('orders/A')!;
    expect(stored.orderStatus).toBe('confirmed');
    expect((stored.notifications as { choiceSentAt: string }).choiceSentAt).toBe(NOW.toISOString());

    // Days later, no reply: no second question, still open, still in the digest.
    send.mockClear();
    const later = await runDailyOrderChecks(db, new Date(NOW.getTime() + 20 * 86400000), send);
    expect(later).toMatchObject({ choiceEmails: 0, overdue: 1 });
    expect(store.get('orders/A')!.orderStatus).toBe('confirmed');
    expect(sentSubjects()).toEqual([expect.stringContaining('[Action needed]')]);
  });

  it('does not ask before day 10, once shipped, or without an email address', async () => {
    order('A', { placedAt: daysAgo(9), notifications: sentFlags });
    order('B', { placedAt: daysAgo(12), orderStatus: 'shipped', notifications: sentFlags });
    order('C', { placedAt: daysAgo(12), customerEmail: '', notifications: sentFlags });
    const result = await runDailyOrderChecks(db, NOW, send);
    expect(result).toMatchObject({ choiceEmails: 0, overdue: 3 });
    expect(store.get('orders/C')!.orderStatus).toBe('confirmed');
  });

  it('asks again 10 days after the customer chose to wait', () => {
    const base = { orderStatus: 'confirmed', customerEmail: 'a@b.c', placedAt: daysAgo(25) } as Order;
    const asked = { ...base, notifications: { choiceSentAt: daysAgo(15) } } as Order;
    expect(shouldAskChoice({ ...asked, customerChoice: 'wait', customerChoiceAt: daysAgo(9) }, NOW)).toBe(false);
    expect(shouldAskChoice({ ...asked, customerChoice: 'wait', customerChoiceAt: daysAgo(10) }, NOW)).toBe(true);
    expect(shouldAskChoice(asked, NOW)).toBe(false);
  });

  it('marks a scratch card coupon used when the order paying with it is placed', async () => {
    order('A', { couponCode: 'ABCDEFGHJKMNPQRS' });
    store.set('coupons/ABCDEFGHJKMNPQRS', { code: 'ABCDEFGHJKMNPQRS', active: true, source: 'scratch' });
    await markOrderPlaced(db, docRef('orders/A') as never, NOW);
    expect(store.get('coupons/ABCDEFGHJKMNPQRS')).toMatchObject({ usedAt: NOW.toISOString(), usedByOrderId: 'A' });
  });

  it('leaves closed, delivered and older orders alone', async () => {
    order('A', { placedAt: daysAgo(20), orderStatus: 'closed' });
    order('B', { placedAt: daysAgo(20), orderStatus: 'delivered' });
    order('C', { placedAt: daysAgo(20), lifecycleVersion: undefined });
    const result = await runDailyOrderChecks(db, NOW, send);
    expect(result.checked).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('respondToOrderChoice', () => {
  const asked = { placedAt: daysAgo(11), statusUpdatedAt: daysAgo(11), notifications: { placedSentAt: 'x', confirmationSentAt: 'x', choiceSentAt: daysAgo(1) } };

  it('cancels on the customer\'s request: refund due, stock back, coupon off, both emailed, once', async () => {
    store.set('products/p1', { ...store.get('products/p1'), inventory: 78, variants: [{ variantId: 'v1', size: 'M', color: 'Olive Green', inventory: 3 }] });
    const stockMoves = [{ productId: 'p1', variantId: 'v1', size: 'M', color: 'Olive Green', quantity: 2 }];
    const rewardCoupon = { code: 'ABCDEFGHJKMNPQRS', label: '10%', startsAt: daysAgo(10), expiresAt: daysAgo(-19), issuedAt: daysAgo(11) };
    store.set('coupons/ABCDEFGHJKMNPQRS', { code: 'ABCDEFGHJKMNPQRS', active: true, source: 'scratch' });
    order('A', { ...asked, stockDeductedAt: daysAgo(11), stockMoves, rewardCoupon });

    const view = await respondToOrderChoice(db, 'A', 'cancel', NOW, send);
    expect(view).toMatchObject({ state: 'cancelled', cancelledByCustomer: true, paid: true, total: 1678 });
    const stored = store.get('orders/A')!;
    expect(stored).toMatchObject({ orderStatus: 'cancelled', paymentStatus: 'refund_due', customerChoice: 'cancel', stockRestoredAt: NOW.toISOString() });
    expect(store.get('products/p1')).toMatchObject({ inventory: 80, variants: [{ inventory: 5 }] });
    expect(store.get('coupons/ABCDEFGHJKMNPQRS')).toMatchObject({ active: false });
    const emails = send.mock.calls as unknown as [{ subject: string; html: string }][];
    expect(emails.map(([e]) => e.subject)).toEqual([
      'Your order #A has been cancelled',
      expect.stringContaining('[Refund due] Customer cancelled delayed order #A'),
    ]);
    expect(emails[0][0].html).toContain('As you asked');
    expect(emails[0][0].html).toContain('5–10 business days');

    send.mockClear();
    expect(await respondToOrderChoice(db, 'A', 'cancel', NOW, send)).toMatchObject({ state: 'cancelled' });
    expect(send).not.toHaveBeenCalled();
    expect(store.get('products/p1')).toMatchObject({ inventory: 80 });
  });

  it('records "wait" and still lets the customer cancel later', async () => {
    order('A', asked);
    expect(await respondToOrderChoice(db, 'A', 'wait', NOW, send)).toMatchObject({ state: 'waiting' });
    expect(store.get('orders/A')).toMatchObject({ orderStatus: 'confirmed', customerChoice: 'wait', customerChoiceAt: NOW.toISOString() });
    expect(send).not.toHaveBeenCalled();
    expect(await respondToOrderChoice(db, 'A', 'cancel', NOW, send)).toMatchObject({ state: 'cancelled' });
  });

  it('never cancels a shipped or delivered order', async () => {
    order('A', { ...asked, orderStatus: 'shipped' });
    order('B', { ...asked, orderStatus: 'delivered' });
    expect(await respondToOrderChoice(db, 'A', 'cancel', NOW, send)).toMatchObject({ state: 'shipped' });
    expect(await respondToOrderChoice(db, 'B', 'cancel', NOW, send)).toMatchObject({ state: 'closed' });
    expect(store.get('orders/A')!.orderStatus).toBe('shipped');
    expect(send).not.toHaveBeenCalled();
  });

  it('reports an unknown order', async () => {
    expect(await respondToOrderChoice(db, 'nope', 'cancel', NOW, send)).toEqual({ state: 'not_found' });
  });
});

describe('order choice tokens', () => {
  it('round-trips and rejects forged or other-key tokens', () => {
    const token = orderChoiceToken('order123', 'k1')!;
    expect(verifyOrderChoiceToken(token, 'k1')).toBe('order123');
    expect(verifyOrderChoiceToken(token, 'k2')).toBeNull();
    const forged = `${Buffer.from('other').toString('base64url')}.${token.split('.')[1]}`;
    expect(verifyOrderChoiceToken(forged, 'k1')).toBeNull();
    expect(verifyOrderChoiceToken('garbage', 'k1')).toBeNull();
    expect(orderChoiceToken('order123', null)).toBeNull();
  });
});

describe('istDate', () => {
  it('uses the India calendar day', () => {
    expect(istDate(new Date('2026-11-20T19:00:00Z'))).toBe('2026-11-21');
  });
});
