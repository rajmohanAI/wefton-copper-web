import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { CatalogError, allocateProductCodes } from '@/services/catalogServer';
import type { Gender } from '@/lib/productCodes';

const GENDERS: Gender[] = ['men', 'women', 'unisex'];

/** Reserves Product IDs for new products. Body: { gender, count? }. */
export async function POST(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { gender?: unknown; count?: unknown } | null;
  const gender = body?.gender as Gender;
  if (!GENDERS.includes(gender)) return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
  const count = body?.count === undefined ? 1 : Number(body.count);
  try {
    const codes = await allocateProductCodes(getAdminDb(), gender, count);
    return NextResponse.json({ codes });
  } catch (error) {
    if (error instanceof CatalogError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[Catalog] Product ID allocation failed:', error);
    return NextResponse.json({ error: 'Could not create a Product ID' }, { status: 500 });
  }
}
