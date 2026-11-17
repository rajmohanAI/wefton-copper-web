import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { getSerialLog, restartSerials } from '@/services/serialServer';

export const dynamic = 'force-dynamic';

/** The changelog of generated serials, newest first. Admin only. */
export async function GET(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  return NextResponse.json({ entries: await getSerialLog(getAdminDb()) });
}

/**
 * DELETE /api/serialgen/history — starts serials afresh: the history moves
 * to an archive and every variant restarts at piece 000001. Admin only.
 */
export async function DELETE(request: NextRequest) {
  const uid = await getRequestAdminUid(request);
  if (!uid) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const by = (await getAdminAuth().getUser(uid).catch(() => null))?.email ?? uid;
  try {
    return NextResponse.json({ archived: await restartSerials(getAdminDb(), by) });
  } catch (error) {
    console.error('[serialgen/history] Archive failed:', error);
    return NextResponse.json({ error: 'Could not clear the history. Please try again.' }, { status: 500 });
  }
}
