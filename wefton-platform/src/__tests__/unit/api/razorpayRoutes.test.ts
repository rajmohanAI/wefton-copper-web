// ============================================================
// Wefton Copper — Razorpay API routes (auth + input checks)
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getRequestUid = vi.fn();
vi.mock('@/lib/serverAuth', () => ({ getRequestUid: (...a: unknown[]) => getRequestUid(...a) }));

const prepareRazorpayOrder = vi.fn();
const confirmRazorpayPayment = vi.fn();
vi.mock('@/services/razorpayPaymentService', async () => {
  class PaymentError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  }
  return {
    PaymentError,
    prepareRazorpayOrder: (...a: unknown[]) => prepareRazorpayOrder(...a),
    confirmRazorpayPayment: (...a: unknown[]) => confirmRazorpayPayment(...a),
  };
});

const notifyOrderPlaced = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/firebaseAdmin', () => ({ getAdminDb: () => ({}) }));
vi.mock('@/services/orderLifecycleServer', () => ({
  notifyOrderPlaced: (...a: unknown[]) => notifyOrderPlaced(...a),
}));

import { POST as orderPOST } from '@/app/api/payments/razorpay/order/route';
import { POST as verifyPOST } from '@/app/api/payments/razorpay/verify/route';
import { PaymentError } from '@/services/razorpayPaymentService';

function req(body: unknown) {
  return new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  getRequestUid.mockResolvedValue('user-1');
});

describe('POST /api/payments/razorpay/order', () => {
  it('requires a signed-in user', async () => {
    getRequestUid.mockResolvedValue(null);
    const res = await orderPOST(req({ orderId: 'WC-1' }));
    expect(res.status).toBe(401);
    expect(prepareRazorpayOrder).not.toHaveBeenCalled();
  });

  it('requires an order id', async () => {
    const res = await orderPOST(req({}));
    expect(res.status).toBe(400);
  });

  it('passes PaymentError status through', async () => {
    prepareRazorpayOrder.mockRejectedValue(new PaymentError(503, 'Online payment is not configured'));
    const res = await orderPOST(req({ orderId: 'WC-1' }));
    expect(res.status).toBe(503);
  });

  it('returns the prepared order for the caller', async () => {
    prepareRazorpayOrder.mockResolvedValue({ razorpayOrderId: 'order_x' });
    const res = await orderPOST(req({ orderId: 'WC-1' }));
    expect(prepareRazorpayOrder).toHaveBeenCalledWith('user-1', 'WC-1');
    expect(await res.json()).toEqual({ razorpayOrderId: 'order_x' });
  });
});

describe('POST /api/payments/razorpay/verify', () => {
  const body = {
    orderId: 'WC-1',
    razorpay_order_id: 'order_x',
    razorpay_payment_id: 'pay_x',
    razorpay_signature: 'sig',
  };

  it('requires a signed-in user', async () => {
    getRequestUid.mockResolvedValue(null);
    expect((await verifyPOST(req(body))).status).toBe(401);
  });

  it('requires every payment field', async () => {
    const res = await verifyPOST(req({ ...body, razorpay_signature: '' }));
    expect(res.status).toBe(400);
    expect(confirmRazorpayPayment).not.toHaveBeenCalled();
  });

  it('confirms the payment for the caller', async () => {
    confirmRazorpayPayment.mockResolvedValue(undefined);
    const res = await verifyPOST(req(body));
    expect(res.status).toBe(200);
    expect(confirmRazorpayPayment).toHaveBeenCalledWith('user-1', 'WC-1', {
      razorpay_order_id: 'order_x',
      razorpay_payment_id: 'pay_x',
      razorpay_signature: 'sig',
    });
    expect(notifyOrderPlaced).toHaveBeenCalledWith({}, 'user-1', 'WC-1');
  });

  it('still succeeds when the order emails fail', async () => {
    confirmRazorpayPayment.mockResolvedValue(undefined);
    notifyOrderPlaced.mockRejectedValueOnce(new Error('smtp down'));
    const res = await verifyPOST(req(body));
    expect(res.status).toBe(200);
  });
});
