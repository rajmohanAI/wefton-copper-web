// ============================================================
// Wefton Copper — Repeat-customer serial offer (server only)
// A genuine serial from a Wefton tag gives a flat discount once, ever. The
// serial is marked used when the order is placed, in serialRedemptions,
// which only the Admin SDK can read or write.
// ============================================================
import { FieldValue, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { parseSerial } from '@/lib/serialgen';
import { checkSerial } from '@/services/serialServer';
import type { Order } from '@/types';

const REDEMPTIONS = 'serialRedemptions';

export interface SerialOfferCheck {
  valid: boolean;
  serial?: string;
  error?: string;
}

/**
 * Whether a serial can be used for the offer. Pass `orderId` when re-checking
 * an order, so the order's own redemption doesn't count against it.
 */
export async function checkSerialOffer(db: Firestore, input: string, orderId?: string): Promise<SerialOfferCheck> {
  const parsed = parseSerial(input);
  if (!parsed) return { valid: false, error: 'That doesn’t look like a Wefton Copper serial' };

  const [genuine, redemption] = await Promise.all([
    checkSerial(db, parsed.serial),
    db.collection(REDEMPTIONS).doc(parsed.serial).get(),
  ]);
  if (!genuine) return { valid: false, error: 'We couldn’t find this serial' };
  if (redemption.exists && redemption.get('orderId') !== orderId) {
    return { valid: false, error: 'This serial has already been used for an offer' };
  }
  return { valid: true, serial: parsed.serial };
}

/**
 * Marks an order's serial as used. Returns true when another order got there
 * first (two checkouts at once): the order is flagged for the admin to review.
 */
export async function redeemOrderSerial(db: Firestore, ref: DocumentReference, order: Order): Promise<boolean> {
  if (!order.offerSerial) return false;
  const redemptionRef = db.collection(REDEMPTIONS).doc(order.offerSerial);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(redemptionRef);
    if (existing.exists && existing.get('orderId') !== order.orderId) {
      tx.update(ref, { offerConflict: true });
      return true;
    }
    tx.set(redemptionRef, { orderId: order.orderId, userId: order.userId, redeemedAt: FieldValue.serverTimestamp() });
    return false;
  });
}
