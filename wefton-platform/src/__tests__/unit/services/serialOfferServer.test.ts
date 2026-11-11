// ============================================================
// Wefton Copper — Repeat-customer serial offer
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => 'now' } }));
vi.mock('@/services/serialServer', () => ({ checkSerial: vi.fn() }));

import { checkSerial } from '@/services/serialServer';
import { checkSerialOffer, redeemOrderSerial } from '@/services/serialOfferServer';
import type { Order } from '@/types';

const SERIAL = 'WCP01M0103000001';
let redemptions: Record<string, { orderId: string }>;

const docRef = (id: string) => ({ id });
const snapshot = (id: string) => ({
  exists: id in redemptions,
  get: (field: 'orderId') => redemptions[id]?.[field],
});
const tx = {
  get: async (ref: { id: string }) => snapshot(ref.id),
  set: vi.fn((ref: { id: string }, data: { orderId: string }) => {
    redemptions[ref.id] = data;
  }),
};
const db = {
  collection: () => ({
    doc: (id: string) => ({ ...docRef(id), get: async () => snapshot(id) }),
  }),
  runTransaction: (fn: (t: typeof tx) => unknown) => fn(tx),
} as unknown as Firestore;
const order = (orderId: string) => ({ orderId, userId: 'u1', offerSerial: SERIAL }) as Order;

beforeEach(() => {
  redemptions = {};
  vi.clearAllMocks();
  vi.mocked(checkSerial).mockResolvedValue({ serial: SERIAL } as never);
});

describe('checkSerialOffer', () => {
  it('accepts a genuine unused serial, however it is typed', async () => {
    await expect(checkSerialOffer(db, ' wcp01m-0103000001 ')).resolves.toEqual({ valid: true, serial: SERIAL });
  });

  it('refuses text that is not a serial', async () => {
    expect((await checkSerialOffer(db, 'hello')).valid).toBe(false);
  });

  it('refuses a serial that was never printed', async () => {
    vi.mocked(checkSerial).mockResolvedValue(null);
    expect((await checkSerialOffer(db, SERIAL)).error).toMatch(/find/);
  });

  it('refuses a serial already used', async () => {
    redemptions[SERIAL] = { orderId: 'other' };
    expect((await checkSerialOffer(db, SERIAL)).error).toMatch(/already been redeemed/);
  });

  it('lets an order re-check its own redemption', async () => {
    redemptions[SERIAL] = { orderId: 'mine' };
    expect((await checkSerialOffer(db, SERIAL, 'mine')).valid).toBe(true);
  });
});

describe('redeemOrderSerial', () => {
  it('marks the serial used', async () => {
    await redeemOrderSerial(db, order('o1'));
    expect(redemptions[SERIAL].orderId).toBe('o1');
  });

  it('does nothing for an order without a serial', async () => {
    await redeemOrderSerial(db, { orderId: 'o1' } as Order);
    expect(tx.set).not.toHaveBeenCalled();
  });

  it('keeps the first redemption when another order got there first', async () => {
    redemptions[SERIAL] = { orderId: 'first' };
    await redeemOrderSerial(db, order('second'));
    expect(redemptions[SERIAL].orderId).toBe('first');
  });
});
