// ============================================================
// Wefton Copper — POST /api/register-piece (MRD-01)
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';

const register = vi.hoisted(() => vi.fn(async (..._a: unknown[]): Promise<string> => 'registered'));
vi.mock('@/lib/firebaseAdmin', () => ({ getAdminDb: () => ({}) }));
vi.mock('@/services/pieceRegistrationServer', () => ({ registerPiece: (...a: unknown[]) => register(...a) }));

import { POST } from '@/app/api/register-piece/route';

const SERIAL = 'WCP01M0103000001';
const post = (body: unknown) =>
  POST(new Request('http://x/api/register-piece', { method: 'POST', body: JSON.stringify(body) }) as never);

beforeEach(() => register.mockReset().mockResolvedValue('registered'));

describe('POST /api/register-piece', () => {
  it('registers with consent off by default and a cleaned source', async () => {
    const res = await post({ serial: SERIAL, email: 'a@example.com', attribution: { utm_source: 'qr', junk: 1 } });
    expect(res.status).toBe(200);
    expect(register.mock.calls[0][1]).toEqual({ serial: SERIAL, email: 'a@example.com', joinFamily: false, source: { utm_source: 'qr' } });
    expect((await res.json()).message).toContain('registered to you');
  });

  it('rejects a malformed serial or email before any lookup', async () => {
    expect((await post({ serial: 'ABC', email: 'a@example.com' })).status).toBe(400);
    expect((await post({ serial: SERIAL, email: 'nope' })).status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it('maps outcomes to status codes', async () => {
    register.mockResolvedValueOnce('not-found');
    expect((await post({ serial: SERIAL, email: 'a@example.com' })).status).toBe(404);
    register.mockResolvedValueOnce('taken');
    expect((await post({ serial: SERIAL, email: 'a@example.com' })).status).toBe(409);
    register.mockResolvedValueOnce('already-yours');
    expect((await post({ serial: SERIAL, email: 'a@example.com' })).status).toBe(200);
  });

  it('returns 500 on a failure', async () => {
    register.mockRejectedValueOnce(new Error('down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await post({ serial: SERIAL, email: 'a@example.com' })).status).toBe(500);
    spy.mockRestore();
  });
});
