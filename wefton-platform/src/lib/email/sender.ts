// ============================================================
// Wefton Copper — Outgoing email (server only)
// Sends through Resend when RESEND_API_KEY is set. Without a key every
// send is skipped (and logged), so callers can record "not sent yet" and
// retry once the key is configured.
// ============================================================
import { Resend } from 'resend';

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  html: string;
  /** Marks the message high priority in mail clients (X-Priority / Importance). */
  highPriority?: boolean;
  replyTo?: string;
}

export type SendResult = { sent: true } | { sent: false; reason: 'not-configured' | 'failed'; error?: string };

const DEFAULT_FROM = 'Wefton Copper <orders@weftoncopper.com>';
const DEFAULT_ADMIN_EMAILS = ['weftoncopper@gmail.com', 'sales@weftoncopper.com'];

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client === undefined) {
    client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }
  return client;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** Addresses that get new-order alerts and the daily overdue reminder. */
export function adminEmails(): string[] {
  const configured = (process.env.ORDER_ALERT_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ADMIN_EMAILS;
}

export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[Email] Not configured; skipped "${email.subject}"`);
    return { sent: false, reason: 'not-configured' };
  }
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo ?? 'sales@weftoncopper.com',
      headers: email.highPriority
        ? { 'X-Priority': '1 (Highest)', 'X-MSMail-Priority': 'High', Importance: 'high' }
        : undefined,
    });
    if (error) {
      console.error(`[Email] Resend rejected "${email.subject}":`, error);
      return { sent: false, reason: 'failed', error: error.message };
    }
    return { sent: true };
  } catch (error) {
    console.error(`[Email] Sending "${email.subject}" failed:`, error);
    return { sent: false, reason: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}
