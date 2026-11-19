// ============================================================
// Wefton Copper — "Join our family" list: join, leave, monthly email
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newsletterMonth, pickRandomPosts, teaser, unsubscribeToken, verifyUnsubscribeToken, type SocialPost } from '@/lib/newsletter';
import { sendMonthlyNewsletter, subscribe, unsubscribe } from '@/services/newsletterServer';

type Data = Record<string, unknown>;
const store = new Map<string, Data>();

function docRef(path: string) {
  return {
    path,
    get: async () => {
      const data = store.get(path);
      return { exists: !!data, data: () => data, get: (k: string) => data?.[k] };
    },
    set: async (d: Data, opts?: { merge?: boolean }) => void store.set(path, opts?.merge ? { ...store.get(path), ...d } : d),
    update: async (u: Data) => void store.set(path, { ...store.get(path), ...u }),
  };
}

const db = {
  doc: (path: string) => docRef(path),
  collection: (name: string) => ({
    doc: (id: string) => docRef(`${name}/${id}`),
    get: async () => ({
      docs: [...store.entries()].filter(([p]) => p.startsWith(`${name}/`)).map(([p, d]) => ({ id: p.split('/')[1], data: () => d, ref: docRef(p) })),
    }),
  }),
  runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
    fn({
      get: (ref: { get: () => unknown }) => ref.get(),
      update: (ref: { path: string }, u: Data) => store.set(ref.path, { ...store.get(ref.path), ...u }),
      create: (ref: { path: string }, d: Data) => store.set(ref.path, d),
    }),
} as never;

const NOW = new Date('2026-12-01T05:00:00Z');
const post = (id: string, day: number): SocialPost => ({
  source: day % 2 ? 'instagram' : 'x',
  id,
  text: `Post ${id}`,
  url: `https://example.com/${id}`,
  postedAt: new Date(Date.UTC(2026, 10, day)).toISOString(),
});
const POSTS = [post('a', 1), post('b', 2), post('c', 3), post('d', 4), post('e', 5)];

beforeEach(() => {
  store.clear();
  process.env.NEWSLETTER_SECRET = 'test-secret';
});

describe('unsubscribe tokens', () => {
  it('round-trips the email and rejects tampering', () => {
    const token = unsubscribeToken('A@Example.com')!;
    expect(verifyUnsubscribeToken(token)).toBe('a@example.com');
    const forged = `${Buffer.from('b@example.com').toString('base64url')}.${token.split('.')[1]}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
    expect(verifyUnsubscribeToken('junk')).toBeNull();
    expect(verifyUnsubscribeToken(token, 'other-secret')).toBeNull();
  });
});

describe('helpers', () => {
  it('names the month in India time', () => {
    expect(newsletterMonth(new Date('2026-11-30T20:00:00Z'))).toBe('2026-12');
  });
  it('picks distinct posts, newest first', () => {
    const picked = pickRandomPosts(POSTS, 3, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.id)).size).toBe(3);
    expect([...picked].sort((x, y) => y.postedAt.localeCompare(x.postedAt))).toEqual(picked);
  });
  it('trims long captions on a word', () => {
    expect(teaser('word '.repeat(100), 20)).toBe('word word word word…');
  });
});

describe('joining and leaving', () => {
  it('adds a member once, welcomes them, and lets them come back after leaving', async () => {
    const send = vi.fn(async () => ({ sent: true }));
    expect(await subscribe(db, ' New@Example.com', NOW, send)).toBe('subscribed');
    expect(store.get('newsletter_subscribers/new@example.com')).toMatchObject({ email: 'new@example.com' });
    const welcome = (send.mock.calls[0] as unknown as [{ to: string; headers: Record<string, string>; html: string }])[0];
    expect(welcome.to).toBe('new@example.com');
    expect(welcome.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(welcome.html).toContain('/unsubscribe?t=');

    expect(await subscribe(db, 'new@example.com', NOW, send)).toBe('already');
    expect(send).toHaveBeenCalledTimes(1);

    await unsubscribe(db, 'new@example.com', NOW);
    expect(store.get('newsletter_subscribers/new@example.com')).toMatchObject({ unsubscribedAt: NOW.toISOString() });
    expect(await subscribe(db, 'new@example.com', NOW, send)).toBe('rejoined');
    expect(store.get('newsletter_subscribers/new@example.com')).toMatchObject({ unsubscribedAt: null });
  });
});

describe('sendMonthlyNewsletter', () => {
  beforeEach(() => {
    store.set('newsletter_subscribers/a@example.com', { email: 'a@example.com' });
    store.set('newsletter_subscribers/b@example.com', { email: 'b@example.com', unsubscribedAt: '2026-11-20T00:00:00Z' });
  });

  it('emails members who are still subscribed, once a month', async () => {
    const send = vi.fn(async () => ({ sent: true }));
    const result = await sendMonthlyNewsletter(db, NOW, { send, posts: async () => POSTS, random: () => 0.3 });
    expect(result).toMatchObject({ month: '2026-12', posts: 3, members: 1, sent: 1 });
    const email = (send.mock.calls[0] as unknown as [{ to: string; html: string }])[0];
    expect(email.to).toBe('a@example.com');
    expect(email.html.match(/See it on/g)).toHaveLength(3);
    expect(email.html).toContain('Unsubscribe');

    const again = await sendMonthlyNewsletter(db, new Date('2026-12-15T05:00:00Z'), { send, posts: async () => POSTS });
    expect(again.skipped).toBe('already-sent');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends nothing without posts, and retries members whose email failed', async () => {
    const send = vi.fn(async () => ({ sent: false }));
    expect((await sendMonthlyNewsletter(db, NOW, { send, posts: async () => [] })).skipped).toBe('no-posts');
    expect(send).not.toHaveBeenCalled();

    await sendMonthlyNewsletter(db, NOW, { send, posts: async () => POSTS });
    expect(store.get('jobs/newsletter')).toBeUndefined();
    const ok = vi.fn(async () => ({ sent: true }));
    expect((await sendMonthlyNewsletter(db, NOW, { send: ok, posts: async () => POSTS })).sent).toBe(1);
  });

  it('needs a signing secret for the unsubscribe links', async () => {
    delete process.env.NEWSLETTER_SECRET;
    delete process.env.CRON_SECRET;
    expect((await sendMonthlyNewsletter(db, NOW, { posts: async () => POSTS })).skipped).toBe('no-secret');
  });
});
