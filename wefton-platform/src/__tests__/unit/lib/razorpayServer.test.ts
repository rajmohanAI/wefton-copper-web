// ============================================================
// Wefton Copper — Razorpay server helpers
// ============================================================
import { createHmac } from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRazorpayConfig, toPaise, verifyPaymentSignature } from '@/lib/razorpay/server';

const SECRET = 'test_secret_not_real';

function sign(orderId: string, paymentId: string, secret = SECRET) {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('verifyPaymentSignature', () => {
  it('accepts the signature Razorpay computes for order|payment', () => {
    expect(verifyPaymentSignature('order_1', 'pay_1', sign('order_1', 'pay_1'), SECRET)).toBe(true);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifyPaymentSignature('order_1', 'pay_1', sign('order_1', 'pay_1', 'other'), SECRET)).toBe(false);
  });

  it('rejects a signature for a different payment or order', () => {
    const sig = sign('order_1', 'pay_1');
    expect(verifyPaymentSignature('order_1', 'pay_2', sig, SECRET)).toBe(false);
    expect(verifyPaymentSignature('order_2', 'pay_1', sig, SECRET)).toBe(false);
  });

  it('rejects malformed signatures without throwing', () => {
    expect(verifyPaymentSignature('order_1', 'pay_1', '', SECRET)).toBe(false);
    expect(verifyPaymentSignature('order_1', 'pay_1', 'abc', SECRET)).toBe(false);
  });
});

describe('toPaise', () => {
  it('converts rupees to integer paise', () => {
    expect(toPaise(1)).toBe(100);
    expect(toPaise(1048.95)).toBe(104895);
    expect(toPaise(0.1 + 0.2)).toBe(30);
  });
});

describe('getRazorpayConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is null until both keys are set', () => {
    vi.stubEnv('RAZORPAY_KEY_ID', '');
    vi.stubEnv('RAZORPAY_KEY_SECRET', '');
    expect(getRazorpayConfig()).toBeNull();
    vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_x');
    expect(getRazorpayConfig()).toBeNull();
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret');
    expect(getRazorpayConfig()).toEqual({ keyId: 'rzp_test_x', keySecret: 'secret' });
  });
});
