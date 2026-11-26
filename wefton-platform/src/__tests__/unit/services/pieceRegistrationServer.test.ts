// ============================================================
// Wefton Copper — "Register your piece" (MRD-01)
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPiece } from '@/services/pieceRegistrationServer';
import type { SerialCheck } from '@/services/serialServer';

type Data = Record<string, unknown>;
const store = new Map<string, Data>();
const docRef = (path: string) => ({ path, get: async () => ({ exists: store.has(path), get: (k: string) => store.get(path)?.[k] }) });
const db = {
  collection: (name: string) => ({ doc: (id: string) => docRef(`${name}/${id}`) }),
  runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      get: (ref: { get: () => unknown }) => ref.get(),
      create: (ref: { path: string }, d: Data) => {
        if (store.has(ref.path)) throw new Error('exists');
        store.set(ref.path, d);
      },
    }),
} as never;

const SERIAL = 'WCP01M0103000001';
const piece: SerialCheck = { serial: SERIAL, modelId: 'P01', product: 'Crew neck tee', color: 'Olive', gender: 'Men', size: 'M', printedAt: null };
const NOW = new Date('2026-11-26T10:00:00Z');
const check = vi.fn(async (_db: unknown, s: string) => (s === SERIAL ? piece : null));
const subscribe = vi.fn(async () => 'subscribed');
const deps = { check, subscribe };

beforeEach(() => {
  store.clear();
  check.mockClear();
  subscribe.mockClear();
});

describe('registerPiece', () => {
  it('registers a genuine serial to the owner, without joining the list by default', async () => {
    expect(await registerPiece(db, { serial: SERIAL, email: ' Asha@Example.com ', joinFamily: false }, NOW, deps)).toBe('registered');
    expect(store.get(`piece_registrations/${SERIAL}`)).toMatchObject({
      serial: SERIAL,
      email: 'asha@example.com',
      product: 'Crew neck tee',
      size: 'M',
      registeredAt: NOW.toISOString(),
      joinedFamily: false,
    });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('joins "Join our family" only when the owner ticked it, passing the source', async () => {
    const source = { utm_source: 'tag-qr' };
    await registerPiece(db, { serial: SERIAL, email: 'a@example.com', joinFamily: true, source }, NOW, deps);
    expect(subscribe).toHaveBeenCalledWith(db, 'a@example.com', NOW, undefined, source);
    expect(store.get(`piece_registrations/${SERIAL}`)).toMatchObject({ joinedFamily: true, source });
  });

  it('keeps the first owner: same email is fine, another email is refused', async () => {
    await registerPiece(db, { serial: SERIAL, email: 'a@example.com', joinFamily: false }, NOW, deps);
    expect(await registerPiece(db, { serial: SERIAL, email: 'A@example.com', joinFamily: false }, NOW, deps)).toBe('already-yours');
    expect(await registerPiece(db, { serial: SERIAL, email: 'b@example.com', joinFamily: true }, NOW, deps)).toBe('taken');
    expect(store.get(`piece_registrations/${SERIAL}`)).toMatchObject({ email: 'a@example.com' });
    expect(subscribe).not.toHaveBeenCalled(); // someone else's piece can't sign them up
  });

  it('refuses a serial we never printed', async () => {
    expect(await registerPiece(db, { serial: 'WCP01M0103999999', email: 'a@example.com', joinFamily: true }, NOW, deps)).toBe('not-found');
    expect(store.size).toBe(0);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('still registers when joining the list fails', async () => {
    subscribe.mockRejectedValueOnce(new Error('mail down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await registerPiece(db, { serial: SERIAL, email: 'a@example.com', joinFamily: true }, NOW, deps)).toBe('registered');
    spy.mockRestore();
  });
});
