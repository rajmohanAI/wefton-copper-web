// ============================================================
// Wefton Copper — Order lifecycle: placed emails, reminders, auto-cancel
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

import { runDailyOrderChecks, markOrderPlaced, istDate } from '@/services/orderLifecycleServer';
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
    expect(first).toMatchObject({ overdue: 1, delayEmails: 1, digestSent: true, cancelled: 0 });
    expect(sentSubjects()).toHaveLength(2);

    // Same day again: no repeat digest, no second apology.
    send.mockClear();
    await runDailyOrderChecks(db, new Date(NOW.getTime() + 3600000), send);
    expect(send).not.toHaveBeenCalled();

    // Next day: digest again, still no second apology.
    await runDailyOrderChecks(db, new Date(NOW.getTime() + 86400000), send);
    expect(sentSubjects()).toEqual([expect.stringContaining('[Action needed]')]);
  });

  it('cancels after 10 days without a status update and promises a refund', async () => {
    order('A', { placedAt: daysAgo(11), statusUpdatedAt: daysAgo(10), notifications: sentFlags });
    const result = await runDailyOrderChecks(db, NOW, send);
    expect(result.cancelled).toBe(1);
    const stored = store.get('orders/A')!;
    expect(stored.orderStatus).toBe('cancelled');
    expect(stored.paymentStatus).toBe('refund_due');
    const cancelEmail = (send.mock.calls as unknown as [{ subject: string; html: string }][]).find(([e]) => e.subject.includes('cancelled'))![0];
    expect(cancelEmail.html).toContain('5–10 business days');
    expect(sentSubjects().some((s) => s.includes('auto-cancelled'))).toBe(true);
  });

  it('does not cancel when the admin updated the status recently, or once shipped', async () => {
    order('A', { placedAt: daysAgo(12), statusUpdatedAt: daysAgo(3), notifications: sentFlags });
    order('B', { placedAt: daysAgo(12), statusUpdatedAt: daysAgo(11), orderStatus: 'shipped', notifications: sentFlags });
    const result = await runDailyOrderChecks(db, NOW, send);
    expect(result.cancelled).toBe(0);
    expect(result.overdue).toBe(2);
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

describe('istDate', () => {
  it('uses the India calendar day', () => {
    expect(istDate(new Date('2026-11-20T19:00:00Z'))).toBe('2026-11-21');
  });
});
