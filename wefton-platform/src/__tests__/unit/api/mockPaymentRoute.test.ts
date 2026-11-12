// ============================================================
// Wefton Copper — Dev-only mock "Submit Payment"
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updates: Record<string, unknown>[] = [];
let order: Record<string, unknown> | null = null;
let adminUid: string | null = 'admin1';
const notify = vi.hoisted(() => vi.fn(async (..._a: unknown[]) => true));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { arrayUnion: (...a: unknown[]) => a, serverTimestamp: () => 'TS' },
}));
vi.mock('@/lib/serverAuth', () => ({ getRequestAdminUid: async () => adminUid }));
vi.mock('@/services/orderLifecycleServer', () => ({ notifyOrderPlaced: (...a: unknown[]) => notify(...a) }));
vi.mock('@/lib/firebaseAdmin', () => ({
  getAdminDb: () => {
    const q = {
      where: () => q,
      limit: () => q,
      get: async () => ({
        empty: !order,
        docs: order ? [{ data: () => order, ref: { update: async (u: Record<string, unknown>) => void updates.push(u) } }] : [],
      }),
    };
    return { collection: () => q };
  },
}));

import { GET, POST } from '@/app/api/payments/mock/route';

const post = (body: unknown) =>
  POST(new Request('http://x/api/payments/mock', { method: 'POST', body: JSON.stringify(body) }) as never);

beforeEach(() => {
  updates.length = 0;
  notify.mockClear();
  adminUid = 'admin1';
  order = { orderId: 'WC-1', userId: 'admin1', paymentStatus: 'pending' };
  vi.stubEnv('MOCK_PAYMENTS_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('mock payment', () => {
  it('is off unless MOCK_PAYMENTS_ENABLED is true', async () => {
    vi.stubEnv('MOCK_PAYMENTS_ENABLED', '');
    expect(await (await GET()).json()).toEqual({ enabled: false });
    expect((await post({ orderId: 'WC-1' })).status).toBe(404);
    expect(updates).toHaveLength(0);
  });

  it('is refused for non-admins', async () => {
    adminUid = null;
    expect((await post({ orderId: 'WC-1' })).status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it('marks the order paid and places it', async () => {
    expect(await (await GET()).json()).toEqual({ enabled: true });
    const res = await post({ orderId: 'WC-1' });
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({ paymentStatus: 'verified', orderStatus: 'confirmed', paymentMethod: 'mock', mockPayment: true });
    expect(notify).toHaveBeenCalledWith(expect.anything(), 'admin1', 'WC-1');
  });

  it('does not pay an order twice', async () => {
    order = { ...order, paymentStatus: 'verified' };
    expect((await post({ orderId: 'WC-1' })).status).toBe(409);
    expect(updates).toHaveLength(0);
  });
});
