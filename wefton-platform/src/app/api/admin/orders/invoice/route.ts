import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestAdminUid } from '@/lib/serverAuth';
import { InvoiceError, generateInvoicePdf } from '@/services/invoiceServer';

// QR rendering (bwip-js) needs the Node.js runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/invoice with { orderId } (the order's document id)
 * returns the order's GST tax invoice as a PDF. The first call gives the
 * order its invoice number; later calls return the same invoice. Admin only.
 */
export async function POST(request: NextRequest) {
  if (!(await getRequestAdminUid(request))) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { orderId?: unknown };
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId || orderId.includes('/')) {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
  }
  try {
    const { bytes, fileName, invoiceNumber } = await generateInvoicePdf(getAdminDb(), orderId);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'no-store',
        'X-Invoice-Number': encodeURIComponent(invoiceNumber),
        'X-Invoice-Filename': fileName,
      },
    });
  } catch (e) {
    if (e instanceof InvoiceError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[invoice] Generation failed:', e);
    return NextResponse.json({ error: 'Invoice generation failed.' }, { status: 500 });
  }
}
