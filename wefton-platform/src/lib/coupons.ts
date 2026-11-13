// ============================================================
// Wefton Copper — Coupon rules (pure logic)
// ============================================================
// A coupon is either a percentage or a fixed rupee discount, never both,
// and is valid from the start of its start date to the end of its end
// date, India time. Shared by the admin form, the cart and the payment
// server, so they always agree.
import type { Coupon } from '@/types';

export type CouponWindow = 'open' | 'scheduled' | 'expired';

const IST_OFFSET = '+05:30';

/** A stored date: an ISO string, or a Firestore Timestamp on older coupons. */
function toDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === 'string') return new Date(raw);
  return (raw as { toDate: () => Date }).toDate();
}

/** Where `now` falls in the coupon's dates. No start date means already started. */
export function couponWindow(coupon: Pick<Coupon, 'startsAt' | 'expiresAt'>, now = new Date()): CouponWindow {
  const start = toDate(coupon.startsAt);
  const end = toDate(coupon.expiresAt);
  if (end && end.getTime() < now.getTime()) return 'expired';
  if (start && start.getTime() > now.getTime()) return 'scheduled';
  return 'open';
}

/** Why a coupon can't be used right now, or null when it can. */
export function couponWindowError(coupon: Pick<Coupon, 'startsAt' | 'expiresAt'>, now = new Date()): string | null {
  const window = couponWindow(coupon, now);
  if (window === 'expired') return 'Coupon has expired';
  if (window === 'scheduled') return 'This coupon is not active yet';
  return null;
}

/** Only 'S' coupons are listed to customers; 'A' ones work only if you know the code. */
export function isPublicCoupon(coupon: Pick<Coupon, 'flag'>): boolean {
  return coupon.flag === 'S';
}

/** "10%" or "₹100". */
export function formatCouponDiscount(coupon: { discount?: number; discountFlat?: number }): string {
  return coupon.discountFlat ? `₹${coupon.discountFlat}` : `${coupon.discount ?? 0}%`;
}

/** Start of a yyyy-mm-dd day in India, as an ISO string. */
export function istDayStart(date: string): string {
  return new Date(`${date}T00:00:00.000${IST_OFFSET}`).toISOString();
}

/** End of a yyyy-mm-dd day in India, as an ISO string. */
export function istDayEnd(date: string): string {
  return new Date(`${date}T23:59:59.999${IST_OFFSET}`).toISOString();
}

/** A stored date as yyyy-mm-dd in India, for a date input. */
export function toIstDateInput(raw: unknown): string {
  const date = toDate(raw);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

export interface CouponFormValues {
  code: string;
  startDate: string;
  endDate: string;
  rupees: string;
  percent: string;
}

/** Checks the admin form; returns the first problem, or null. */
export function validateCouponForm(v: CouponFormValues): string | null {
  const code = v.code.trim();
  if (!code) return 'Coupon ID is required';
  if (!/^[A-Za-z0-9]+$/.test(code)) return 'Coupon ID can only have letters and numbers';
  if (code.length > 20) return 'Coupon ID must be 20 characters or less';
  if (!v.startDate) return 'Start date is required';
  if (!v.endDate) return 'End date is required';
  if (v.endDate < v.startDate) return 'End date cannot be before the start date';
  if (v.rupees && v.percent) return 'Enter either a rupee discount or a percentage, not both';
  if (!v.rupees && !v.percent) return 'Enter a rupee discount or a percentage';
  if (v.rupees && !(Number.isInteger(Number(v.rupees)) && Number(v.rupees) >= 1)) {
    return 'Rupee discount must be a whole number of at least 1';
  }
  if (v.percent && !(Number.isInteger(Number(v.percent)) && Number(v.percent) >= 1 && Number(v.percent) <= 100)) {
    return 'Percentage must be a whole number from 1 to 100';
  }
  return null;
}

/** Rupees a coupon would take off these cart lines. */
export function couponSavings(
  coupon: Pick<Coupon, 'discount' | 'discountFlat'>,
  lines: { price: number; quantity: number }[]
): number {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  if (coupon.discountFlat) return Math.min(coupon.discountFlat, subtotal);
  return (subtotal * (coupon.discount || 0)) / 100;
}

/**
 * The coupons a customer may pick from: enabled, flagged 'S' (shown to all),
 * and inside their dates right now. Biggest saving on this cart first.
 */
export function pickAvailableCoupons<T extends Pick<Coupon, 'active' | 'flag' | 'startsAt' | 'expiresAt' | 'discount' | 'discountFlat'>>(
  coupons: T[],
  lines: { price: number; quantity: number }[],
  now = new Date()
): T[] {
  return coupons
    .filter((c) => c.active && isPublicCoupon(c) && couponWindow(c, now) === 'open')
    .sort((a, b) => couponSavings(b, lines) - couponSavings(a, lines));
}

/** "Valid till 30 Nov", in India time; null when the coupon has no end date. */
export function formatCouponEnd(raw: unknown): string | null {
  const date = toDate(raw);
  if (!date) return null;
  return `Valid till ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(date)}`;
}

// ============================================================
// Scratch card coupons
// ============================================================
// Every placed order earns one: a 16-character code, private (flag 'A'),
// not tied to any customer, usable once, from 24 hours after it is issued
// until 30 days after it is issued. Cancelling the order that earned it
// switches it off.

export const SCRATCH_CODE_LENGTH = 16;
export const SCRATCH_STARTS_AFTER_HOURS = 24;
export const SCRATCH_VALID_DAYS = 30;
/** What every scratch card coupon takes off: a fixed ₹100. */
export const SCRATCH_DISCOUNT_FLAT = 100;

/** Letters and digits, minus 0/O and 1/I/L so a code is easy to read back. */
const SCRATCH_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A random scratch card code. `randomInt(n)` must return 0..n-1. */
export function generateScratchCode(randomInt: (n: number) => number): string {
  let code = '';
  for (let i = 0; i < SCRATCH_CODE_LENGTH; i++) code += SCRATCH_ALPHABET[randomInt(SCRATCH_ALPHABET.length)];
  return code;
}

/** When a scratch coupon issued at `issuedAt` starts and stops working. */
export function scratchCouponDates(issuedAt: Date): { startsAt: string; expiresAt: string } {
  const hour = 60 * 60 * 1000;
  return {
    startsAt: new Date(issuedAt.getTime() + SCRATCH_STARTS_AFTER_HOURS * hour).toISOString(),
    expiresAt: new Date(issuedAt.getTime() + SCRATCH_VALID_DAYS * 24 * hour).toISOString(),
  };
}

/**
 * Why a coupon can't be used right now, or null when it can: its dates,
 * and for a scratch card coupon whether it was already used.
 */
export function couponUseError(
  coupon: Pick<Coupon, 'startsAt' | 'expiresAt' | 'source' | 'usedAt'>,
  now = new Date()
): string | null {
  if (coupon.source === 'scratch' && coupon.usedAt) return 'This coupon has already been used';
  return couponWindowError(coupon, now);
}

export function isScratchCoupon(coupon: Pick<Coupon, 'source'>): boolean {
  return coupon.source === 'scratch';
}

/** "13 Nov, 9:50 am", in India time. */
export function formatIstDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** When a reward coupon works, for the customer: "Valid from … till …", or that it has expired. */
export function rewardCouponValidity(reward: { startsAt: string; expiresAt: string }, now = new Date()): string {
  if (new Date(reward.expiresAt).getTime() < now.getTime()) return `Expired on ${formatIstDateTime(reward.expiresAt)}`;
  return `Valid from ${formatIstDateTime(reward.startsAt)} till ${formatIstDateTime(reward.expiresAt)}`;
}
