import { NextRequest, NextResponse } from 'next/server';
import { getRequestUid } from '@/lib/serverAuth';
import { PaymentError, prepareRazorpayOrder } from '@/services/razorpayPaymentService';

/**
 * Step 1 of Razorpay Standard Checkout: create the Razorpay order on the
 * server for a Firestore order the caller owns. Body: { orderId }.
 */
export async function POST(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });

  try {
    const prepared = await prepareRazorpayOrder(uid, orderId);
    return NextResponse.json(prepared);
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`[Razorpay] Order creation failed for ${orderId}:`, error);
    return NextResponse.json({ error: 'Could not start online payment' }, { status: 502 });
  }
}
