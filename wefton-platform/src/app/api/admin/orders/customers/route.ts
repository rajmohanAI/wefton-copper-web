import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';

/**
 * Emails for customers of older orders, which didn't store one.
 * Body: { uids: string[] } → { emails: { [uid]: email } }. Admin only.
 */
export async function POST(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { uids?: unknown } | null;
  const uids = Array.isArray(body?.uids)
    ? [...new Set(body.uids.filter((u): u is string => typeof u === 'string' && u.length > 0 && u.length <= 128))].slice(0, 100)
    : [];
  if (uids.length === 0) return NextResponse.json({ emails: {} });
  const { users } = await getAdminAuth().getUsers(uids.map((uid) => ({ uid })));
  return NextResponse.json({ emails: Object.fromEntries(users.map((u) => [u.uid, u.email || ''])) });
}
