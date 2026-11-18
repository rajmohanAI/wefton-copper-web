import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminBucket, getAdminDb } from '@/lib/firebaseAdmin';
import { getRequestUid } from '@/lib/serverAuth';
import { adminEmails, sendEmail } from '@/lib/email/sender';
import { escapeHtml } from '@/lib/email/orderEmails';
import {
  COMPLAINT_TOPICS,
  MAX_IMAGES,
  REPORT_TOPICS,
  RETURN_OUTCOMES,
  RETURN_REASONS,
  SUGGESTION_TOPICS,
  confirmationMessage,
  isAllowedImage,
  labelFor,
  newRequestId,
  returnWindow,
  wheezRequestSchema,
  type WheezRequestType,
} from '@/lib/wheez';
import { findAccessibleOrder } from '@/services/wheezServer';

const TYPE_LABELS: Record<WheezRequestType, string> = {
  return: 'Return / replacement / refund',
  complaint: 'Complaint / feedback',
  suggestion: 'Suggestion',
  report: 'Website error / inappropriate content',
};

function topicLabel(type: WheezRequestType, topic: string): string {
  const list = { return: RETURN_REASONS, complaint: COMPLAINT_TOPICS, suggestion: SUGGESTION_TOPICS, report: REPORT_TOPICS }[type];
  return labelFor(list, topic);
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Wheez requests (WC-Issue-13): returns with photos, complaints,
 * suggestions and error reports. Sent as multipart form data: a `payload`
 * JSON field plus up to 3 `images`. Saved to `support_requests` under a
 * WZ-… request ID, and emailed to the support inbox.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return bad('Please try again');
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(form.get('payload') ?? ''));
  } catch {
    return bad('Please try again');
  }
  const parsed = wheezRequestSchema.safeParse(payload);
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? 'Please check your request');
  const data = parsed.data;
  if (data.website) return NextResponse.json({ ok: true, requestId: '', message: confirmationMessage(data.type, '') });

  const images = form.getAll('images').filter((f): f is File => typeof f === 'object' && 'arrayBuffer' in f);
  if (images.length > MAX_IMAGES) return bad(`Please attach up to ${MAX_IMAGES} photos`);
  if (images.some((f) => !isAllowedImage(f.type, f.size))) return bad('Photos must be JPG, PNG, WebP or HEIC, up to 5 MB each');
  if (data.type === 'return' && images.length === 0) return bad('Please attach at least one photo of what you received');

  const uid = await getRequestUid(request);
  let accountEmail = '';
  let accountName = '';
  if (uid) {
    const user = await getAdminAuth().getUser(uid).catch(() => null);
    accountEmail = user?.email ?? '';
    accountName = user?.displayName ?? '';
  }
  const email = (data.email || accountEmail).toLowerCase();
  if (!email && data.type !== 'report') return bad('Please enter your email so we can reply');

  const db = getAdminDb();
  let order: DocumentData | null = null;
  let returnedItems: { title: string; size: string; color: string; quantity: number }[] = [];
  if (data.type === 'return') {
    try {
      order = await findAccessibleOrder(db, data.orderId || '', uid, data.contact || '');
    } catch (error) {
      console.error('[Wheez] Order lookup failed:', error);
      return bad('Please try again later', 500);
    }
    if (!order) return bad("We couldn't find an order with those details", 404);
    const windowState = returnWindow(order);
    if (windowState !== 'open') {
      return bad(
        windowState === 'expired'
          ? 'Returns can be raised within 7 days of delivery, and this order is past that.'
          : 'Returns can be raised once the order is delivered.',
      );
    }
    const products = Array.isArray(order.products) ? order.products : [];
    returnedItems = (data.items || [])
      .filter((i) => i < products.length)
      .map((i) => ({
        title: String(products[i].title || ''),
        size: String(products[i].size || ''),
        color: String(products[i].color || ''),
        quantity: Number(products[i].quantity || 1),
      }));
    if (!returnedItems.length) return bad('Please pick the items');
  }

  // Claim a request ID (the document ID), retrying on the rare clash.
  const col = db.collection('support_requests');
  let requestId = '';
  for (let attempt = 0; attempt < 3 && !requestId; attempt++) {
    const id = newRequestId();
    try {
      await col.doc(id).create({ requestId: id, status: 'new', source: 'wheez', createdAt: FieldValue.serverTimestamp() });
      requestId = id;
    } catch (error) {
      if ((error as { code?: number }).code !== 6) {
        console.error('[Wheez] Saving the request failed:', error);
        return bad('We could not send your request. Please use the Contact Us page instead.', 500);
      }
    }
  }
  if (!requestId) return bad('Please try again', 500);

  // Photos go to Storage under the request; only admins read them (via the API).
  const imagePaths: string[] = [];
  try {
    const bucket = getAdminBucket();
    for (const [i, file] of images.entries()) {
      const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const path = `support/wheez/${requestId}/${i + 1}.${ext}`;
      await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), { contentType: file.type, resumable: false });
      imagePaths.push(path);
    }
  } catch (error) {
    console.error(`[Wheez] Photo upload for ${requestId} failed:`, error);
    await col.doc(requestId).delete().catch(() => {});
    return bad('We could not upload your photos. Please try again, or send them on WhatsApp.', 500);
  }

  const record = {
    type: data.type,
    topic: data.topic,
    topicLabel: topicLabel(data.type, data.topic),
    outcome: data.outcome || '',
    orderId: order ? String(order.orderId) : (data.orderId || '').toUpperCase(),
    items: returnedItems,
    message: data.details || '',
    pageUrl: data.pageUrl || '',
    name: data.name || accountName,
    email,
    phone: order ? String(order.customerPhone || '') : '',
    userId: uid || '',
    images: imagePaths,
  };
  try {
    await col.doc(requestId).update(record);
  } catch (error) {
    console.error(`[Wheez] Saving ${requestId} failed:`, error);
    return bad('We could not send your request. Please use the Contact Us page instead.', 500);
  }

  const rows: [string, string][] = [
    ['Request', requestId],
    ['Type', TYPE_LABELS[data.type]],
    ['Topic', record.topicLabel],
    ...(data.type === 'return'
      ? ([
          ['Order', record.orderId],
          ['Wants', labelFor(RETURN_OUTCOMES, record.outcome)],
          ['Items', returnedItems.map((i) => `${i.title} (${[i.size, i.color].filter(Boolean).join(', ')}) x${i.quantity}`).join('; ')],
          ['Photos', String(imagePaths.length)],
        ] as [string, string][])
      : []),
    ['Name', record.name || '-'],
    ['Email', email || '-'],
    ...(record.pageUrl ? ([['Page', record.pageUrl]] as [string, string][]) : []),
  ];
  const result = await sendEmail({
    to: adminEmails(),
    ...(email ? { replyTo: email } : {}),
    subject: `Wheez: ${TYPE_LABELS[data.type]} ${requestId}`,
    html: `<table style="font-family:sans-serif;font-size:14px">${rows
      .map(([k, v]) => `<tr><td style="color:#888;padding-right:12px">${k}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('')}</table>${
      record.message ? `<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(record.message)}</p>` : ''
    }<p style="font-family:sans-serif;font-size:12px;color:#888">Open Admin → Support to see the photos and update the status.</p>`,
  });
  if (!result.sent) console.warn(`[Wheez] Email for ${requestId} not sent: ${result.reason}`);

  return NextResponse.json({ ok: true, requestId, message: confirmationMessage(data.type, requestId) });
}
