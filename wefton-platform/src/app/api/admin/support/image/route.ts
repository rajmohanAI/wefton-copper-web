import { NextRequest, NextResponse } from 'next/server';
import { getAdminBucket } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';

/** Streams a Wheez request photo to an admin (the photos are not public). */
export async function GET(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const path = request.nextUrl.searchParams.get('path') || '';
  if (!/^support\/wheez\/WZ-\d{6}-[A-Z2-9]{4}\/\d\.[a-z]+$/.test(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }
  try {
    const file = getAdminBucket().file(path);
    const [[buffer], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': String(meta.contentType || 'image/jpeg'), 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
