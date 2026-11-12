import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestUid } from '@/lib/serverAuth';
import { markOrderPlaced } from '@/services/orderLifecycleServer';
import { issueRewardCoupon } from '@/services/scratchCouponServer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/reward — body { orderId }. The scratch card coupon the
 * signed-in customer's placed order earned, issuing it on the first call.
 * Answers { reward: null } when the order can't earn one.
 */
export async function POST(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

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
    if (snap.empty) return NextResponse.json({ reward: null });
    const ref = snap.docs[0].ref;
    // The UPI flow reports the order as placed at the same moment; both are safe to repeat.
    await markOrderPlaced(db, ref);
    const reward = await issueRewardCoupon(db, ref);
    return NextResponse.json({ reward }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(`[Orders] Reward coupon for ${orderId} failed:`, error);
    return NextResponse.json({ error: 'Could not load your reward' }, { status: 500 });
  }
}
