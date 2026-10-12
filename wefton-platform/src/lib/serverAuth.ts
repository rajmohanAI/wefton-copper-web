// ============================================================
// Wefton Copper — Request auth for API routes (server only)
// The browser sends the signed-in user's Firebase ID token as
// `Authorization: Bearer <token>`; this checks it with the Admin SDK.
// ============================================================
import type { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

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
