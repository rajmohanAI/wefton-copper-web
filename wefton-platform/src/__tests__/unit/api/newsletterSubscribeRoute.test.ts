// ============================================================
// Wefton Copper — "Join our family" API saves the visit's source (MRD-01)
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';

const subscribe = vi.hoisted(() => vi.fn(async (..._a: unknown[]) => 'subscribed'));
vi.mock('@/lib/firebaseAdmin', () => ({ getAdminDb: () => ({}) }));
vi.mock('@/services/newsletterServer', () => ({ subscribe: (...a: unknown[]) => subscribe(...a) }));

import { POST } from '@/app/api/newsletter/subscribe/route';

const post = (body: unknown) =>
  POST(new Request('http://x/api/newsletter/subscribe', { method: 'POST', body: JSON.stringify(body) }) as never);

beforeEach(() => subscribe.mockClear());

describe('POST /api/newsletter/subscribe', () => {
  it('passes a cleaned source to the list', async () => {
    const res = await post({ email: 'a@example.com', attribution: { utm_source: ' instagram ', evil: '<x>', landingPage: '/' } });
    expect(res.status).toBe(200);
    expect(subscribe.mock.calls[0][1]).toBe('a@example.com');
    expect(subscribe.mock.calls[0][4]).toEqual({ utm_source: 'instagram', landingPage: '/' });
  });

  it('passes no source when none was sent (no consent)', async () => {
    await post({ email: 'a@example.com' });
    expect(subscribe.mock.calls[0][4]).toBeNull();
  });

  it('rejects a bad email before touching the list', async () => {
    const res = await post({ email: 'nope', attribution: { utm_source: 'x' } });
    expect(res.status).toBe(400);
    expect(subscribe).not.toHaveBeenCalled();
  });
});
