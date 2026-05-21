// ============================================================
// Wefton Copper — Coupon Service (Firestore)
// ============================================================
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { Coupon } from '@/types';

const COUPONS_COL = 'coupons';

export interface CouponValidationResult {
  valid: boolean;
  discount?: number;
  error?: string;
}

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

/**
 * Validates a coupon code against the Firestore `coupons` collection.
 *
 * - Queries for a document where `code == input.toUpperCase()` and `active == true`
 * - If not found, returns `{ valid: false, error: "Invalid coupon code" }`
 * - If found but expired (`expiresAt` is in the past), returns `{ valid: false, error: "Coupon has expired" }`
 * - If valid, returns `{ valid: true, discount: doc.discount }`
 *
 * @param code - The coupon code string entered by the user
 * @returns A promise resolving to the validation result
 */
export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  const db = requireDb();

  const normalizedCode = code.toUpperCase();

  const q = query(
    collection(db, COUPONS_COL),
    where('code', '==', normalizedCode),
    where('active', '==', true)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return { valid: false, error: 'Invalid coupon code' };
  }

  const couponDoc = snap.docs[0];
  const coupon = couponDoc.data() as Coupon;

  // Check expiration — expiresAt can be a Firestore Timestamp or a string date
  if (coupon.expiresAt) {
    const expiresDate = typeof coupon.expiresAt === 'string'
      ? new Date(coupon.expiresAt)
      : (coupon.expiresAt as unknown as { toDate: () => Date }).toDate();

    if (expiresDate.getTime() < Date.now()) {
      return { valid: false, error: 'Coupon has expired' };
    }
  }

  return { valid: true, discount: coupon.discount };
}
