import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { contactSchema, topicLabel } from '@/lib/contact';
import { adminEmails, sendEmail } from '@/lib/email/sender';
import { escapeHtml } from '@/lib/email/orderEmails';

/**
 * Contact Us form (WC-Issue-9). Saves the message to `support_requests`
 * and emails the support inbox, with Reply-To set to the customer.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form' },
      { status: 400 },
    );
  }
  const data = parsed.data;
  // Honeypot filled: pretend success so bots learn nothing.
  if (data.website) return NextResponse.json({ ok: true });

  let requestId = '';
  try {
    const ref = await getAdminDb().collection('support_requests').add({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || '',
      orderId: data.orderId || '',
      topic: data.topic,
      message: data.message,
      status: 'new',
      source: 'contact-page',
      createdAt: FieldValue.serverTimestamp(),
    });
    requestId = ref.id;
  } catch (error) {
    console.error('[Contact] Saving the request failed:', error);
    return NextResponse.json(
      { error: 'We could not send your message. Please email or WhatsApp us instead.' },
      { status: 500 },
    );
  }

  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || '-'],
    ['Order', data.orderId || '-'],
    ['Topic', topicLabel(data.topic)],
  ];
  const result = await sendEmail({
    to: adminEmails(),
    replyTo: data.email,
    subject: `Contact Us: ${topicLabel(data.topic)} from ${data.name}`,
    html: `<table style="font-family:sans-serif;font-size:14px">${rows
      .map(([k, v]) => `<tr><td style="color:#888;padding-right:12px">${k}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('')}</table><p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(
      data.message,
    )}</p><p style="font-family:sans-serif;font-size:12px;color:#888">Request ${escapeHtml(requestId)}</p>`,
  });
  if (!result.sent) console.warn(`[Contact] Email for ${requestId} not sent: ${result.reason}`);

  return NextResponse.json({ ok: true, requestId });
}
