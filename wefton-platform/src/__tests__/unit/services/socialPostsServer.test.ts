// ============================================================
// Wefton Copper — Reading our latest Instagram / X posts
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLatestSocialPosts } from '@/services/socialPostsServer';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  delete process.env.X_BEARER_TOKEN;
  delete process.env.X_USER_ID;
});

describe('fetchLatestSocialPosts', () => {
  it('skips sources without keys', async () => {
    const doFetch = vi.fn();
    expect(await fetchLatestSocialPosts(doFetch as never)).toEqual([]);
    expect(doFetch).not.toHaveBeenCalled();
  });

  it('maps Instagram and X posts, and survives one source failing', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'ig';
    process.env.X_BEARER_TOKEN = 'xb';
    process.env.X_USER_ID = '42';
    const doFetch = vi.fn(async (url: URL) =>
      url.hostname === 'graph.instagram.com'
        ? json({ data: [{ id: '1', caption: 'New drop', media_type: 'VIDEO', thumbnail_url: 'https://img/t.jpg', permalink: 'https://instagram.com/p/1', timestamp: '2026-11-20T10:00:00+0000' }] })
        : json({
            data: [{ id: '9', text: 'Hello', created_at: '2026-11-21T10:00:00.000Z', attachments: { media_keys: ['m1'] } }],
            includes: { media: [{ media_key: 'm1', type: 'photo', url: 'https://img/x.jpg' }] },
          })
    );
    const posts = await fetchLatestSocialPosts(doFetch as never);
    expect(posts).toEqual([
      { source: 'instagram', id: '1', text: 'New drop', imageUrl: 'https://img/t.jpg', url: 'https://instagram.com/p/1', postedAt: '2026-11-20T10:00:00.000Z' },
      { source: 'x', id: '9', text: 'Hello', imageUrl: 'https://img/x.jpg', url: 'https://x.com/i/web/status/9', postedAt: '2026-11-21T10:00:00.000Z' },
    ]);

    const failing = vi.fn(async (url: URL) => (url.hostname === 'api.x.com' ? new Response('', { status: 429 }) : json({ data: [] })));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await fetchLatestSocialPosts(failing as never)).toEqual([]);
    expect(errors).toHaveBeenCalled();
  });
});
