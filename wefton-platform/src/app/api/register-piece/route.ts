import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { parseSerial } from '@/lib/serialgen';
import { sanitizeAttribution } from '@/lib/attribution';
import { registerPiece, type RegisterResult } from '@/services/pieceRegistrationServer';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  serial: z.string().refine((s) => Boolean(parseSerial(s)), 'That doesn’t look like a Wefton Copper serial.'),
  email: z.string().email('Please enter a valid email address'),
  joinFamily: z.boolean().default(false),
});

const MESSAGES: Record<RegisterResult, string> = {
  registered: 'Thank you! This piece is now registered to you.',
  'already-yours': 'This piece is already registered to you.',
  taken: 'This piece is already registered. If it’s yours, write to sales@weftoncopper.com with a photo of the tag.',
  'not-found': 'We couldn’t find this serial.',
};

/** POST /api/register-piece — an owner registers a genuine serial to their email (MRD-01). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please check the details' }, { status: 400 });
  }
  try {
    const source = sanitizeAttribution((body as { attribution?: unknown }).attribution);
    const result = await registerPiece(getAdminDb(), { ...parsed.data, source });
    const status = result === 'not-found' ? 404 : result === 'taken' ? 409 : 200;
    return NextResponse.json({ result, message: MESSAGES[result] }, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[register-piece] Failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
