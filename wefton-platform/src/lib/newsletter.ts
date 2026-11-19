// ============================================================
// Wefton Copper — "Join our family" mailing list rules (server only)
// Members get one promotional email a month, made from a random pick of
// our latest Instagram / X posts. Every email carries a personal
// unsubscribe link: a signed token, so nobody can unsubscribe someone else.
// ============================================================
import { createHmac, timingSafeEqual } from 'crypto';

export interface SocialPost {
  source: 'instagram' | 'x';
  id: string;
  /** Post text, trimmed for the email. */
  text: string;
  /** Picture to show, when the post has one. */
  imageUrl?: string;
  /** Link to the post itself. */
  url: string;
  postedAt: string;
}

/** How many posts go in one monthly email. */
export const POSTS_PER_EMAIL = 3;

function secret(): string | null {
  return process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || null;
}

const b64url = (s: string) => Buffer.from(s).toString('base64url');

function sign(email: string, key: string): string {
  return createHmac('sha256', key).update(`unsubscribe:${email}`).digest('base64url');
}

/** A token that unsubscribes `email`, or null when no signing secret is set. */
export function unsubscribeToken(email: string, key = secret()): string | null {
  if (!key) return null;
  const normalised = email.trim().toLowerCase();
  return `${b64url(normalised)}.${sign(normalised, key)}`;
}

/** The email a token unsubscribes, or null when it is forged or malformed. */
export function verifyUnsubscribeToken(token: string, key = secret()): string | null {
  if (!key || typeof token !== 'string') return null;
  const [encoded, mac] = token.split('.');
  if (!encoded || !mac) return null;
  let email: string;
  try {
    email = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(email, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return email;
}

/** "2026-11", in India time: one monthly email per member per month. */
export function newsletterMonth(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' })
    .format(now)
    .slice(0, 7);
}

/**
 * `count` posts picked at random from the latest ones (newest first in the
 * result). `random()` returns 0..1, like Math.random.
 */
export function pickRandomPosts(posts: SocialPost[], count = POSTS_PER_EMAIL, random: () => number = Math.random): SocialPost[] {
  const pool = [...posts];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

/** Post text cut to a readable teaser. */
export function teaser(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}
