import { NextRequest, NextResponse } from 'next/server';

// Runs server-side so the browser fetches the garment image same-origin,
// avoiding cross-origin/CORS and canvas-tainting problems when compositing
// the Try-On preview on a <canvas>.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only proxy images from hosts we trust (the project's own storage/CDN).
const ALLOWED_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
];

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/**
 * GET /api/tryon/garment?url=<encoded image url>
 * Fetches a product/garment image and streams it back same-origin so the
 * Try-On canvas can use it without CORS restrictions.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });
  }

  // Support both absolute URLs (Firebase Storage) and local public paths.
  let target: URL;
  try {
    target = new URL(raw, request.nextUrl.origin);
  } catch {
    return NextResponse.json({ error: 'Invalid url.' }, { status: 400 });
  }

  // Local/public-path images are same-origin already — allow those.
  const sameOrigin = target.origin === request.nextUrl.origin;
  if (!sameOrigin && !ALLOWED_HOSTS.includes(target.hostname)) {
    return NextResponse.json({ error: 'Image host not allowed.' }, { status: 400 });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Unsupported protocol.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), { redirect: 'follow' });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image (${upstream.status}).` },
        { status: 502 }
      );
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.includes(baseType)) {
      return NextResponse.json({ error: 'Not an image.' }, { status: 415 });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': baseType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (e) {
    console.error('[tryon/garment] proxy failed:', e);
    return NextResponse.json({ error: 'Could not load the garment image.' }, { status: 502 });
  }
}
