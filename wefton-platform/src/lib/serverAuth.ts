// ============================================================
// Wefton Copper — Request auth for API routes (server only)
// The browser sends the signed-in user's Firebase ID token as
// `Authorization: Bearer <token>`; this checks it with the Admin SDK.
// ============================================================
import type { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

/** Returns the caller's uid, or null when the token is missing or invalid. */
export async function getRequestUid(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Returns the caller's uid when they are signed in as an admin, else null. */
export async function getRequestAdminUid(request: NextRequest): Promise<string | null> {
  const uid = await getRequestUid(request);
  if (!uid) return null;
  const snap = await getAdminDb().collection('users').doc(uid).get();
  return snap.exists && snap.get('role') === 'admin' ? uid : null;
}
