// ============================================================
// Wefton Copper — "Join our family" mailing list (server only)
// Members live in `newsletter_subscribers/{email}`. Unsubscribing keeps the
// doc with `unsubscribedAt` set, and joining again clears it.
// ============================================================
import type { Firestore } from 'firebase-admin/firestore';
import { newsletterMonth, pickRandomPosts, unsubscribeToken, type SocialPost } from '@/lib/newsletter';
import { monthlyNewsletterEmail, welcomeEmail } from '@/lib/email/newsletterEmails';
import { SITE } from '@/lib/email/orderEmails';
import { sendEmail, type OutgoingEmail } from '@/lib/email/sender';
import { fetchLatestSocialPosts } from './socialPostsServer';

const COL = 'newsletter_subscribers';
const JOB_DOC = 'jobs/newsletter';

type Send = (email: OutgoingEmail) => Promise<{ sent: boolean }>;

export interface Subscriber {
  email: string;
  subscribedAt: unknown;
  unsubscribedAt?: string | null;
  /** Month ("2026-11") of the last monthly email this member got. */
  lastNewsletterMonth?: string;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || SITE).replace(/\/$/, '');
}

/** The page link in the email, and the one-click link mail apps call. Null without a signing secret. */
export function unsubscribeLinks(email: string): { page: string; oneClick: string } | null {
  const token = unsubscribeToken(email);
  if (!token) return null;
  const t = encodeURIComponent(token);
  return { page: `${siteUrl()}/unsubscribe?t=${t}`, oneClick: `${siteUrl()}/api/newsletter/unsubscribe?t=${t}` };
}

function withUnsubscribe(to: string, build: (url: string) => { subject: string; html: string }): OutgoingEmail | null {
  const links = unsubscribeLinks(to);
  if (!links) return null;
  return {
    to,
    ...build(links.page),
    headers: { 'List-Unsubscribe': `<${links.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

export type SubscribeResult = 'subscribed' | 'already' | 'rejoined';

/** Adds a member (or brings back one who unsubscribed) and sends the welcome email. */
export async function subscribe(db: Firestore, rawEmail: string, now = new Date(), send: Send = sendEmail): Promise<SubscribeResult> {
  const email = rawEmail.trim().toLowerCase();
  const ref = db.collection(COL).doc(email);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && !snap.get('unsubscribedAt')) return 'already' as const;
    if (snap.exists) {
      tx.update(ref, { unsubscribedAt: null, rejoinedAt: now.toISOString() });
      return 'rejoined' as const;
    }
    tx.create(ref, { email, subscribedAt: now });
    return 'subscribed' as const;
  });
  if (result !== 'already') {
    const welcome = withUnsubscribe(email, welcomeEmail);
    if (welcome) await send(welcome).catch((error) => console.error('[Newsletter] Welcome email failed:', error));
  }
  return result;
}

/** Marks a member unsubscribed. Safe to repeat; unknown emails are ignored. */
export async function unsubscribe(db: Firestore, email: string, now = new Date()): Promise<void> {
  const ref = db.collection(COL).doc(email.trim().toLowerCase());
  const snap = await ref.get();
  if (!snap.exists || snap.get('unsubscribedAt')) return;
  await ref.update({ unsubscribedAt: now.toISOString() });
}

export interface MonthlyResult {
  month: string;
  skipped?: 'already-sent' | 'no-posts' | 'no-secret';
  posts: number;
  members: number;
  sent: number;
}

/**
 * Sends this month's email to every member who hasn't had it yet. Run it
 * as often as you like: each member gets one per month, and a run that
 * stopped half way picks up where it left off.
 */
export async function sendMonthlyNewsletter(
  db: Firestore,
  now = new Date(),
  deps: { send?: Send; posts?: () => Promise<SocialPost[]>; random?: () => number } = {}
): Promise<MonthlyResult> {
  const { send = sendEmail, posts: loadPosts = fetchLatestSocialPosts, random = Math.random } = deps;
  const month = newsletterMonth(now);
  const result: MonthlyResult = { month, posts: 0, members: 0, sent: 0 };

  const jobRef = db.doc(JOB_DOC);
  if ((await jobRef.get()).get('completedMonth') === month) return { ...result, skipped: 'already-sent' };
  if (!unsubscribeLinks('check@example.com')) return { ...result, skipped: 'no-secret' };

  const picked = pickRandomPosts(await loadPosts(), undefined, random);
  result.posts = picked.length;
  if (!picked.length) return { ...result, skipped: 'no-posts' };

  const snap = await db.collection(COL).get();
  let failed = 0;
  for (const docSnap of snap.docs) {
    const member = docSnap.data() as Subscriber;
    if (member.unsubscribedAt || member.lastNewsletterMonth === month) continue;
    result.members++;
    const email = withUnsubscribe(member.email || docSnap.id, (url) => monthlyNewsletterEmail(picked, url));
    if (!email) continue;
    const { sent } = await send(email);
    if (sent) {
      await docSnap.ref.update({ lastNewsletterMonth: month });
      result.sent++;
    } else {
      failed++;
    }
  }
  if (!failed) await jobRef.set({ completedMonth: month, completedAt: now.toISOString(), lastSent: result.sent }, { merge: true });
  return result;
}
