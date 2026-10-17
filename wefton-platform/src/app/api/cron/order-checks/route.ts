import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isEmailConfigured } from '@/lib/email/sender';
import { runDailyOrderChecks } from '@/services/orderLifecycleServer';

export const dynamic = 'force-dynamic';

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily order checks (run by the "Daily order checks" GitHub Actions
 * schedule): reminders after 5 days, auto-cancel after 10 days without a
 * status update. Needs `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  // Cancelling without telling anyone would be worse than waiting a day.
  if (!isEmailConfigured()) return NextResponse.json({ error: 'Email is not configured' }, { status: 503 });
  try {
    const result = await runDailyOrderChecks(getAdminDb());
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Orders] Daily checks failed:', error);
    return NextResponse.json({ error: 'Daily checks failed' }, { status: 500 });
  }
}
