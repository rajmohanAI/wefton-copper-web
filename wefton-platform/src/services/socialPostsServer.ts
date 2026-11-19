// ============================================================
// Wefton Copper — Latest Instagram / X posts (server only)
// Instagram: Instagram API with Instagram Login, needs INSTAGRAM_ACCESS_TOKEN
// (a long-lived token for the Wefton Copper professional account).
// X: API v2, needs X_BEARER_TOKEN and X_USER_ID (the numeric id of @weftoncopper).
// A source without its keys is skipped, so the email works with either one.
// ============================================================
import type { SocialPost } from '@/lib/newsletter';

type Fetch = typeof fetch;
const LATEST = 12;

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

export async function fetchInstagramPosts(doFetch: Fetch = fetch): Promise<SocialPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];
  const url = new URL('https://graph.instagram.com/me/media');
  url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp');
  url.searchParams.set('limit', String(LATEST));
  url.searchParams.set('access_token', token);
  const res = await doFetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Instagram returned HTTP ${res.status}`);
  const { data = [] } = (await res.json()) as { data?: InstagramMedia[] };
  return data.map((m) => ({
    source: 'instagram' as const,
    id: m.id,
    text: m.caption || '',
    imageUrl: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
    url: m.permalink,
    postedAt: new Date(m.timestamp).toISOString(),
  }));
}

interface XResponse {
  data?: { id: string; text: string; created_at: string; attachments?: { media_keys?: string[] } }[];
  includes?: { media?: { media_key: string; type: string; url?: string; preview_image_url?: string }[] };
}

export async function fetchXPosts(doFetch: Fetch = fetch): Promise<SocialPost[]> {
  const token = process.env.X_BEARER_TOKEN;
  const userId = process.env.X_USER_ID;
  if (!token || !userId) return [];
  const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(userId)}/tweets`);
  url.searchParams.set('max_results', String(Math.max(LATEST, 10)));
  url.searchParams.set('exclude', 'replies,retweets');
  url.searchParams.set('tweet.fields', 'created_at,attachments');
  url.searchParams.set('expansions', 'attachments.media_keys');
  url.searchParams.set('media.fields', 'url,preview_image_url,type');
  const res = await doFetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`X returned HTTP ${res.status}`);
  const body = (await res.json()) as XResponse;
  const media = new Map((body.includes?.media || []).map((m) => [m.media_key, m]));
  return (body.data || []).map((t) => {
    const first = t.attachments?.media_keys?.map((k) => media.get(k)).find(Boolean);
    return {
      source: 'x' as const,
      id: t.id,
      text: t.text,
      imageUrl: first?.url || first?.preview_image_url,
      url: `https://x.com/i/web/status/${t.id}`,
      postedAt: new Date(t.created_at).toISOString(),
    };
  });
}

/** Latest posts from every configured source. One failing source doesn't stop the other. */
export async function fetchLatestSocialPosts(doFetch: Fetch = fetch): Promise<SocialPost[]> {
  const results = await Promise.allSettled([fetchInstagramPosts(doFetch), fetchXPosts(doFetch)]);
  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.error(`[Newsletter] Fetching ${i === 0 ? 'Instagram' : 'X'} posts failed:`, r.reason);
    return [];
  });
}

export function isSocialFeedConfigured(): boolean {
  return !!process.env.INSTAGRAM_ACCESS_TOKEN || !!(process.env.X_BEARER_TOKEN && process.env.X_USER_ID);
}
