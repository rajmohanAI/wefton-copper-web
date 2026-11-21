// ============================================================
// Wefton Copper — "Wait or cancel?" links for delayed orders (WC-Issue-20)
// The 10-day delay email carries a personal link to /order-response. The
// link holds a signed token naming the order, so nobody can answer for
// someone else's order. Opening the link never changes anything: the
// customer confirms their choice on the page.
// ============================================================
import { createHmac, timingSafeEqual } from 'crypto';

export type OrderChoice = 'wait' | 'cancel';
export const ORDER_CHOICES: OrderChoice[] = ['wait', 'cancel'];

function secret(): string | null {
  return process.env.ORDER_LINK_SECRET || process.env.CRON_SECRET || null;
}

function sign(orderDocId: string, key: string): string {
  return createHmac('sha256', key).update(`order-choice:${orderDocId}`).digest('base64url');
}

/** A token for the order with this Firestore doc id, or null when no signing secret is set. */
export function orderChoiceToken(orderDocId: string, key = secret()): string | null {
  if (!key || !orderDocId) return null;
  return `${Buffer.from(orderDocId).toString('base64url')}.${sign(orderDocId, key)}`;
}

/** The order doc id a token names, or null when it is forged or malformed. */
export function verifyOrderChoiceToken(token: unknown, key = secret()): string | null {
  if (!key || typeof token !== 'string') return null;
  const [encoded, mac, extra] = token.split('.');
  if (!encoded || !mac || extra !== undefined) return null;
  const id = Buffer.from(encoded, 'base64url').toString('utf8');
  if (!id || id.includes('/')) return null;
  const expected = Buffer.from(sign(id, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

export function isOrderChoice(value: unknown): value is OrderChoice {
  return typeof value === 'string' && (ORDER_CHOICES as string[]).includes(value);
}
