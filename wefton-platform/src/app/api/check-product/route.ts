import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { parseSerial } from '@/lib/serialgen';
import { checkSerial } from '@/services/serialServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/check-product?serial=WCP01M0103000001 — public. Tells a customer
 * whether the serial on their tag was printed by us, and what it is.
 */
export async function GET(request: NextRequest) {
  const serial = request.nextUrl.searchParams.get('serial') ?? '';
  if (!parseSerial(serial)) {
    return NextResponse.json(
      { error: 'That doesn’t look like a Wefton Copper serial. It has 16 characters and starts with WC, e.g. WCP01M0103000001.' },
      { status: 400 }
    );
  }
  try {
    const result = await checkSerial(getAdminDb(), serial);
    return NextResponse.json(result ? { found: true, product: result } : { found: false }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[check-product] Lookup failed:', error);
    return NextResponse.json({ error: 'We couldn’t check that serial right now. Please try again.' }, { status: 500 });
  }
}
