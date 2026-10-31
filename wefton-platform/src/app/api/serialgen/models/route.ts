import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { CatalogError } from '@/services/catalogServer';
import { addSerialModel } from '@/services/serialServer';

export const dynamic = 'force-dynamic';

/** Adds a product/model to the sticker list with the next id. Body: { name }. */
export async function POST(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  try {
    const models = await addSerialModel(getAdminDb(), typeof body?.name === 'string' ? body.name : '');
    return NextResponse.json({ models });
  } catch (error) {
    if (error instanceof CatalogError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[serialgen] Add model failed:', error);
    return NextResponse.json({ error: 'Could not add product' }, { status: 500 });
  }
}
