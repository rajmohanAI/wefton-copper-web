import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { checkCouponCode } from '@/services/couponServer';

export const dynamic = 'force-dynamic';

/** POST /api/coupons/validate — body { code }. Says whether a typed coupon can be used. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code.slice(0, 40) : '';
  try {
    return NextResponse.json(await checkCouponCode(getAdminDb(), code), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[Coupons] Validate failed:', error);
    return NextResponse.json({ valid: false, error: 'Could not check that coupon. Please try again.' }, { status: 500 });
  }
}
