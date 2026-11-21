import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isOrderChoice, verifyOrderChoiceToken } from '@/lib/orderResponse';
import { respondToOrderChoice } from '@/services/orderLifecycleServer';

export const dynamic = 'force-dynamic';

/**
 * The customer's answer to the 10-day "wait or cancel?" email
 * (WC-Issue-20). Called by the /order-response page with the signed token
 * from the email link. POST only, so a mail scanner opening the link can
 * never cancel an order.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { t?: unknown; choice?: unknown } | null;
  const orderDocId = verifyOrderChoiceToken(body?.t);
  if (!orderDocId) return NextResponse.json({ error: 'This link is not valid' }, { status: 400 });
  if (!isOrderChoice(body?.choice)) return NextResponse.json({ error: 'Please choose to wait or cancel' }, { status: 400 });
  try {
    const view = await respondToOrderChoice(getAdminDb(), orderDocId, body.choice);
    if (view.state === 'not_found') return NextResponse.json({ error: 'We could not find this order' }, { status: 404 });
    return NextResponse.json(view);
  } catch (error) {
    console.error('[Orders] Recording the customer choice failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
