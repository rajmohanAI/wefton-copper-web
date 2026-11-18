import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestUid } from '@/lib/serverAuth';
import { orderLookupSchema } from '@/lib/wheez';
import { findAccessibleOrder, recentOrders, summarizeOrder } from '@/services/wheezServer';

/**
 * Wheez order lookup (WC-Issue-13).
 * - Signed in, no order number: the customer's 5 most recent orders.
 * - Order number: that order, if it is the caller's own or `contact`
 *   (the email or phone used for the order) matches.
 */
export async function POST(request: NextRequest) {
  const parsed = orderLookupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please check the order number' }, { status: 400 });
  const { orderId = '', contact = '' } = parsed.data;
  const uid = await getRequestUid(request);

  try {
    const db = getAdminDb();
    if (!orderId) {
      if (!uid) return NextResponse.json({ error: 'Please enter your order number' }, { status: 400 });
      const orders = await recentOrders(db, uid);
      return NextResponse.json({ orders: orders.map((o) => summarizeOrder(o)) });
    }
    if (!uid && !contact) {
      return NextResponse.json({ error: 'Please enter the email or phone number used for the order' }, { status: 400 });
    }
    const order = await findAccessibleOrder(db, orderId, uid, contact);
    if (!order) {
      return NextResponse.json(
        { error: "We couldn't find an order with those details. Please check the order number and the email or phone." },
        { status: 404 },
      );
    }
    return NextResponse.json({ orders: [summarizeOrder(order)] });
  } catch (error) {
    console.error('[Wheez] Order lookup failed:', error);
    return NextResponse.json({ error: 'Order lookup is not available right now. Please try again later.' }, { status: 500 });
  }
}
