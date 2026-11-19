// ============================================================
// Wefton Copper — "Join our family" sign-up from the browser
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeNewsletter } from '@/services/newsletterService';

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('subscribeNewsletter', () => {
  it('posts the trimmed email and reports a new member', async () => {
    const fetchMock = respond(200, { result: 'subscribed', message: 'Welcome to the family!' });
    expect(await subscribeNewsletter('  New@Example.com ')).toEqual({ success: true, message: 'Welcome to the family!' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/newsletter/subscribe');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'New@Example.com' });
  });

  it('says so when the email is already on the list', async () => {
    respond(200, { result: 'already', message: "You're already part of the family" });
    expect(await subscribeNewsletter('a@example.com')).toEqual({ success: false, message: "You're already part of the family" });
  });

  it('throws when the server fails', async () => {
    respond(500, { error: 'Something went wrong' });
    await expect(subscribeNewsletter('a@example.com')).rejects.toThrow('Something went wrong');
  });
});
