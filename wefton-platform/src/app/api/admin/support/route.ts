import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { toDate } from '@/lib/wheez';
import { isSupportStatus } from '@/lib/support';

/** Admin → Support: Contact Us messages and Wheez requests, newest first. */
export async function GET(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const snap = await getAdminDb().collection('support_requests').orderBy('createdAt', 'desc').limit(200).get();
    const requests = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        requestId: data.requestId || d.id,
        createdAt: toDate(data.createdAt)?.toISOString() ?? null,
        updatedAt: toDate(data.updatedAt)?.toISOString() ?? null,
      };
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('[Support] Listing requests failed:', error);
    return NextResponse.json({ error: 'Could not load requests' }, { status: 500 });
  }
}

/** Update a request's status, with an optional internal note. */
export async function PATCH(request: NextRequest) {
  const adminUid = await getRequestAdminUid(request);
  if (!adminUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string; note?: string } | null;
  const id = String(body?.id || '');
  const status = String(body?.status || '');
  if (!id || !isSupportStatus(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  try {
    await getAdminDb()
      .collection('support_requests')
      .doc(id)
      .update({
        status,
        ...(body?.note ? { adminNote: String(body.note).slice(0, 1000) } : {}),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: adminUid,
      });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Support] Updating request failed:', error);
    return NextResponse.json({ error: 'Could not update the request' }, { status: 500 });
  }
}
