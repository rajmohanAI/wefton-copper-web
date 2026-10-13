// ============================================================
// Wefton Copper — Razorpay (server only)
// Payment gateway provided through IDFC FIRST Bank.
// RAZORPAY_KEY_SECRET is read only here and must never reach the browser:
// do not give it a NEXT_PUBLIC_ prefix and do not import this file from a
// client component.
// Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/
// ============================================================
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';

export const RAZORPAY_CURRENCY = 'INR';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

/** Returns null until both keys are set in the environment. */
export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getRazorpayConfig() !== null;
}

export function createRazorpayClient(config: RazorpayConfig): Razorpay {
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}

/** Rupees to paise (Razorpay amounts are in the currency's smallest unit). */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Checks the signature Checkout returns after a successful payment:
 * HMAC-SHA256 of `${razorpay_order_id}|${razorpay_payment_id}` keyed with the
 * key secret, hex encoded.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const expected = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
