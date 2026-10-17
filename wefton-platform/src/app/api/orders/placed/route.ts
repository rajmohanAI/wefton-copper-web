import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestUid } from '@/lib/serverAuth';
import { notifyOrderPlaced } from '@/services/orderLifecycleServer';

/**
 * Called by checkout after the UPI screenshot is uploaded. Body: { orderId }.
 * Stamps the order as placed and sends the order emails; safe to repeat.
 */
export async function POST(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) return NextResponse.json({ error: 'Missing order' }, { status: 400 });

  try {
    const placed = await notifyOrderPlaced(getAdminDb(), uid, orderId);
    return NextResponse.json({ placed });
  } catch (error) {
    console.error(`[Orders] Placing ${orderId} failed:`, error);
    return NextResponse.json({ error: 'Could not record the order' }, { status: 500 });
  }
}
