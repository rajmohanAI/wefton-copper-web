import { NextResponse } from 'next/server';
import { isRazorpayConfigured } from '@/lib/razorpay/server';

// Read the environment on every request, not at build time.
export const dynamic = 'force-dynamic';

/** Tells checkout whether to offer online payment. Exposes no key material. */
export async function GET() {
  return NextResponse.json({ enabled: isRazorpayConfigured() });
}
