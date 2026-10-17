import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { CatalogError, addColor, getColors } from '@/services/catalogServer';

export const dynamic = 'force-dynamic';

/** The colour master used for variant SKUs. Admin only. */
export async function GET(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  return NextResponse.json({ colors: await getColors(getAdminDb()) });
}

/** Adds a colour. Body: { name, hex }. */
export async function POST(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown; hex?: unknown } | null;
  try {
    const colors = await addColor(
      getAdminDb(),
      typeof body?.name === 'string' ? body.name : '',
      typeof body?.hex === 'string' ? body.hex : ''
    );
    return NextResponse.json({ colors });
  } catch (error) {
    if (error instanceof CatalogError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[Catalog] Add colour failed:', error);
    return NextResponse.json({ error: 'Could not add colour' }, { status: 500 });
  }
}
