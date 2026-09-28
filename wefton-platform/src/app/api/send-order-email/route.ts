import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isValidEmail, buildEmailPayload, type EmailType } from '@/services/orderEmailService';
import type { Order } from '@/types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  if (!resend) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { order, type, recipientEmail } = body as {
    order: Order;
    type: EmailType;
    recipientEmail: string;
  };

  // Validate recipient email before sending
  if (!isValidEmail(recipientEmail)) {
    return NextResponse.json(
      { error: 'Invalid or missing email address' },
      { status: 400 }
    );
  }

  const payload = buildEmailPayload(order, type, recipientEmail);

  try {
    await resend.emails.send({
      from: 'Wefton Copper <orders@weftoncopper.com>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error and retry once after 5-second delay
    console.error(`[OrderEmail] Failed for order ${order.orderId}:`, error);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      await resend.emails.send({
        from: 'Wefton Copper <orders@weftoncopper.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
      return NextResponse.json({ success: true, retried: true });
    } catch (retryError) {
      console.error(`[OrderEmail] Retry failed for order ${order.orderId}:`, retryError);
      return NextResponse.json(
        { error: 'Email delivery failed after retry' },
        { status: 502 }
      );
    }
  }
}
