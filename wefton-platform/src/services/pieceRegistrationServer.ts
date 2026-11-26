// ============================================================
// Wefton Copper — "Register your piece" (MRD-01, server only)
// An owner who scans the tag QR (or checks a serial) can tie that piece
// to their email. Registrations live in `piece_registrations/{serial}`;
// the first owner keeps it. Joining "Join our family" is a separate,
// optional tick (consent), handled by the newsletter list.
// ============================================================
import type { Firestore } from 'firebase-admin/firestore';
import type { Attribution } from '@/lib/attribution';
import { checkSerial, type SerialCheck } from './serialServer';
import { subscribe as subscribeToFamily } from './newsletterServer';

export const REGISTRATIONS = 'piece_registrations';

export type RegisterResult = 'registered' | 'already-yours' | 'taken' | 'not-found';

export interface RegisterInput {
  serial: string;
  email: string;
  /** The owner ticked "send me the monthly email". */
  joinFamily: boolean;
  source?: Attribution | null;
}

export interface RegisterDeps {
  check?: (db: Firestore, serial: string) => Promise<SerialCheck | null>;
  subscribe?: (db: Firestore, email: string, now: Date, send: undefined, source: Attribution | null) => Promise<unknown>;
}

/** Ties a genuine serial to an email, once. Optionally joins the family list. */
export async function registerPiece(
  db: Firestore,
  input: RegisterInput,
  now = new Date(),
  deps: RegisterDeps = {},
): Promise<RegisterResult> {
  const check = await (deps.check ?? checkSerial)(db, input.serial);
  if (!check) return 'not-found';

  const email = input.email.trim().toLowerCase();
  const ref = db.collection(REGISTRATIONS).doc(check.serial);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return snap.get('email') === email ? ('already-yours' as const) : ('taken' as const);
    tx.create(ref, {
      serial: check.serial,
      email,
      modelId: check.modelId,
      product: check.product,
      color: check.color,
      gender: check.gender,
      size: check.size,
      registeredAt: now.toISOString(),
      joinedFamily: input.joinFamily,
      ...(input.source ? { source: input.source } : {}),
    });
    return 'registered' as const;
  });

  // The family list is the owner's separate choice; only the registered owner can join from here.
  if (result !== 'taken' && input.joinFamily) {
    const join = deps.subscribe ?? ((d, e, n, _s, src) => subscribeToFamily(d, e, n, undefined, src));
    await join(db, email, now, undefined, input.source ?? null).catch((error: unknown) =>
      console.error('[register-piece] Joining the family list failed:', error),
    );
  }
  return result;
}
