import { NextRequest, NextResponse } from 'next/server';
import { getRequestUid } from '@/lib/serverAuth';
import { PaymentError, confirmRazorpayPayment } from '@/services/razorpayPaymentService';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notifyOrderPlaced } from '@/services/orderLifecycleServer';

const FIELDS = ['orderId', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'] as const;

/**
 * Step 3 of Razorpay Standard Checkout: verify the payment signature on the
 * server and mark the order paid. Body: { orderId, razorpay_order_id,
 * razorpay_payment_id, razorpay_signature }.
 */
export async function POST(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const values = Object.fromEntries(
    FIELDS.map((f) => [f, typeof body?.[f] === 'string' ? (body[f] as string).trim() : ''])
  ) as Record<(typeof FIELDS)[number], string>;
  if (FIELDS.some((f) => !values[f])) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  try {
    await confirmRazorpayPayment(uid, values.orderId, {
      razorpay_order_id: values.razorpay_order_id,
      razorpay_payment_id: values.razorpay_payment_id,
      razorpay_signature: values.razorpay_signature,
    });
    // The payment is recorded; a failed email must not fail checkout (the
    // daily job retries anything that didn't go out).
    await notifyOrderPlaced(getAdminDb(), uid, values.orderId).catch((error) =>
      console.error(`[Orders] Placed emails for ${values.orderId} failed:`, error)
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`[Razorpay] Verification failed for ${values.orderId}:`, error);
    return NextResponse.json({ error: 'Could not confirm payment' }, { status: 502 });
  }
}
