// ============================================================
// Wefton Copper — orders remember the visit's source, with consent (MRD-01)
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Address, CartItem } from '@/types';

const added = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock('@/lib/firebase', () => ({ getFirebaseDb: () => ({}), getFirebaseAuth: () => null, getFirebaseStorage: () => null }));
vi.mock('firebase/storage', () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: () => 'orders',
  addDoc: async (_c: unknown, data: Record<string, unknown>) => {
    added.push(data);
    return { id: 'doc1' };
  },
  serverTimestamp: () => 'TS',
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  runTransaction: vi.fn(),
  arrayUnion: vi.fn(),
  Timestamp: { now: vi.fn() },
}));

import { createOrder } from '@/services/orderService';
import { captureLanding } from '@/lib/attribution';
import { writeConsent } from '@/lib/consent';
import { fakeBrowser } from '../helpers/fakeBrowser';

const items = [{ productId: 'p1', title: 'Tee', price: 1299, quantity: 1, size: 'M', color: 'Olive', variantId: 'v1' }] as unknown as CartItem[];
const address = { name: 'A', phone: '9', line1: 'x', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' } as unknown as Address;

beforeEach(() => {
  added.length = 0;
  fakeBrowser('https://www.weftoncopper.com/men?utm_source=instagram&utm_campaign=launch', 'https://l.instagram.com/');
  captureLanding();
});
afterEach(() => vi.unstubAllGlobals());

describe('createOrder attribution', () => {
  it('saves the source when the buyer allowed analytics', async () => {
    writeConsent('granted');
    await createOrder('u1', items, address);
    expect(added[0].attribution).toMatchObject({ utm_source: 'instagram', utm_campaign: 'launch', landingPage: '/men', referrer: 'l.instagram.com' });
  });

  it('saves nothing extra when the buyer said no or has not chosen', async () => {
    await createOrder('u1', items, address);
    writeConsent('denied');
    await createOrder('u1', items, address);
    expect(added[0]).not.toHaveProperty('attribution');
    expect(added[1]).not.toHaveProperty('attribution');
  });

  it('keeps the rules-required fields as before', async () => {
    writeConsent('granted');
    await createOrder('u1', items, address);
    expect(added[0]).toMatchObject({ userId: 'u1', paymentStatus: 'pending', orderStatus: 'placed' });
    expect(added[0]).not.toHaveProperty('razorpayOrderId');
  });
});
