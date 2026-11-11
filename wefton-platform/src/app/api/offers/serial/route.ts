import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { checkSerialOffer } from '@/services/serialOfferServer';

export const dynamic = 'force-dynamic';

/** POST /api/offers/serial — body { serial }. Says whether a tag serial can be used for the offer. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { serial?: unknown } | null;
  const serial = typeof body?.serial === 'string' ? body.serial.slice(0, 40) : '';
  try {
    return NextResponse.json(await checkSerialOffer(getAdminDb(), serial), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[Offers] Serial check failed:', error);
    return NextResponse.json({ valid: false, error: 'Could not check that serial. Please try again.' }, { status: 500 });
  }
}
