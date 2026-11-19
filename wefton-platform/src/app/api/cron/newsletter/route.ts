import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isEmailConfigured } from '@/lib/email/sender';
import { sendMonthlyNewsletter } from '@/services/newsletterServer';

export const dynamic = 'force-dynamic';

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(request.headers.get('authorization') || '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Monthly "Join our family" email (run by the "Monthly newsletter" GitHub
 * Actions schedule). Needs `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!isEmailConfigured()) return NextResponse.json({ error: 'Email is not configured' }, { status: 503 });
  try {
    return NextResponse.json(await sendMonthlyNewsletter(getAdminDb()));
  } catch (error) {
    console.error('[Newsletter] Monthly email failed:', error);
    return NextResponse.json({ error: 'Monthly email failed' }, { status: 500 });
  }
}
