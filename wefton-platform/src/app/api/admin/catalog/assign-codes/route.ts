import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { CatalogError, assignMissingProductCodes } from '@/services/catalogServer';

/** One-off: gives existing products without a Product ID one. */
export async function POST(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  try {
    const assigned = await assignMissingProductCodes(getAdminDb());
    return NextResponse.json({ assigned });
  } catch (error) {
    if (error instanceof CatalogError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[Catalog] Assigning Product IDs failed:', error);
    return NextResponse.json({ error: 'Could not assign Product IDs' }, { status: 500 });
  }
}
