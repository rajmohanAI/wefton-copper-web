import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyUnsubscribeToken } from '@/lib/newsletter';
import { unsubscribe } from '@/services/newsletterServer';

/**
 * Unsubscribes the member a signed token names. Called by the
 * /unsubscribe page, and by mail apps' one-click unsubscribe
 * (List-Unsubscribe-Post), which send the token in the URL.
 */
export async function POST(request: NextRequest) {
  let token = request.nextUrl.searchParams.get('t') || '';
  if (!token && request.headers.get('content-type')?.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as { t?: unknown } | null;
    token = typeof body?.t === 'string' ? body.t : '';
  }
  const email = verifyUnsubscribeToken(token);
  if (!email) return NextResponse.json({ error: 'This unsubscribe link is not valid' }, { status: 400 });
  try {
    await unsubscribe(getAdminDb(), email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Newsletter] Unsubscribing failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
