// ============================================================
// Wefton Copper — Coupon lookup (server only)
// Private ("A") coupons can't be read from the browser, so a typed code
// is checked here with the Admin SDK.
// ============================================================
import type { Firestore } from 'firebase-admin/firestore';
import { couponUseError } from '@/lib/coupons';
import type { Coupon } from '@/types';

export interface CouponCheck {
  valid: boolean;
  discount?: number;
  discountFlat?: number;
  error?: string;
}

/** Checks a typed code: it must exist, be enabled and be within its dates. */
export async function checkCouponCode(db: Firestore, code: string): Promise<CouponCheck> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { valid: false, error: 'Invalid coupon code' };

  const snap = await db
    .collection('coupons')
    .where('code', '==', normalized)
    .where('active', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return { valid: false, error: 'Invalid coupon code' };

  const coupon = snap.docs[0].data() as Coupon;
  const windowError = couponUseError(coupon);
  if (windowError) return { valid: false, error: windowError };
  return { valid: true, discount: coupon.discount || 0, discountFlat: coupon.discountFlat || 0 };
}
