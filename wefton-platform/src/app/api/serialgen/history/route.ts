import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { getSerialLog } from '@/services/serialServer';

export const dynamic = 'force-dynamic';

/** The changelog of generated serials, newest first. Admin only. */
export async function GET(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  return NextResponse.json({ entries: await getSerialLog(getAdminDb()) });
}
