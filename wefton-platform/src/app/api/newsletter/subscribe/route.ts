import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { emailSchema } from '@/lib/schemas';
import { subscribe } from '@/services/newsletterServer';
import { sanitizeAttribution } from '@/lib/attribution';

const MESSAGES = {
  subscribed: 'Welcome to the family! Check your inbox for a hello from us.',
  rejoined: 'Welcome back to the family!',
  already: "You're already part of the family",
} as const;

/** "Join our family" form in the footer (WC-Issue-17). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please enter a valid email address' }, { status: 400 });
  }
  try {
    const source = sanitizeAttribution((body as { attribution?: unknown }).attribution);
    const result = await subscribe(getAdminDb(), parsed.data.email, new Date(), undefined, source);
    return NextResponse.json({ result, message: MESSAGES[result] });
  } catch (error) {
    console.error('[Newsletter] Subscribing failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
