import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { isMockPaymentEnabled } from '@/lib/mockPayments';
import { notifyOrderPlaced } from '@/services/orderLifecycleServer';
import type { OrderStatusEvent } from '@/types';

// Read the environment on every request, not at build time.
export const dynamic = 'force-dynamic';

/** GET — whether checkout should offer the mock "Submit Payment" option. */
export async function GET() {
  return NextResponse.json({ enabled: isMockPaymentEnabled() });
}

/**
 * POST — body { orderId }. Marks the signed-in admin's own unpaid order as
 * paid (dev testing only), then places it like a real payment would.
 */
export async function POST(request: NextRequest) {
  if (!isMockPaymentEnabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const uid = await getRequestAdminUid(request);
  if (!uid) return NextResponse.json({ error: 'Mock payment is for admins only' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) return NextResponse.json({ error: 'Missing order' }, { status: 400 });

  try {
    const db = getAdminDb();
    const snap = await db
      .collection('orders')
      .where('orderId', '==', orderId)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    if (snap.empty) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const ref = snap.docs[0].ref;
    const order = snap.docs[0].data();
    if (order.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'This order is not waiting for payment' }, { status: 409 });
    }

    const at = new Date().toISOString();
    const event: OrderStatusEvent = { status: 'confirmed', at, by: 'admin', note: 'Mock payment (dev testing)' };
    await ref.update({
      paymentStatus: 'verified',
      orderStatus: 'confirmed',
      paymentMethod: 'mock',
      paymentReference: `MOCK-${Date.now()}`,
      mockPayment: true,
      statusHistory: FieldValue.arrayUnion(event),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await notifyOrderPlaced(db, uid, orderId).catch((error) =>
      console.error(`[Orders] Placed emails for ${orderId} failed:`, error)
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[MockPay] ${orderId} failed:`, error);
    return NextResponse.json({ error: 'Mock payment failed' }, { status: 500 });
  }
}
