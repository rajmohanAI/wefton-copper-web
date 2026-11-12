// ============================================================
// Wefton Copper — Scratch card coupons (server only)
// 1. issueRewardCoupon: a placed order earns one coupon, once. The coupon
//    doc id is its code, and the order keeps a copy so the customer can
//    see it again and cancelling the order can find it.
// 2. redeemScratchCoupon: an order placed with a scratch coupon uses it up.
// 3. invalidateRewardCoupon: cancelling the order that earned a coupon
//    switches the coupon off.
// The coupon itself is not tied to a customer: anyone with the code can
// use it, once.
// ============================================================
import { randomInt } from 'crypto';
import { FieldValue, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import {
  formatCouponDiscount,
  generateScratchCode,
  normalizeScratchSettings,
  scratchCouponDates,
  type ScratchCouponSettings,
} from '@/lib/coupons';
import type { Coupon, Order, RewardCoupon } from '@/types';

export const SCRATCH_SETTINGS_DOC = 'settings/scratchCoupon';

export async function getScratchSettings(db: Firestore): Promise<ScratchCouponSettings> {
  const snap = await db.doc(SCRATCH_SETTINGS_DOC).get();
  return normalizeScratchSettings(snap.exists ? (snap.data() as Partial<ScratchCouponSettings>) : null);
}

/**
 * Gives a placed order its scratch card coupon, or returns the one it
 * already has. Null when the order can't earn one: not placed yet,
 * cancelled, or scratch cards are switched off.
 */
export async function issueRewardCoupon(
  db: Firestore,
  orderRef: DocumentReference,
  now = new Date(),
  random: (n: number) => number = randomInt
): Promise<RewardCoupon | null> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return null;
    const order = snap.data() as Order;
    if (order.rewardCoupon?.code) return order.rewardCoupon;
    if (!order.placedAt || order.orderStatus === 'cancelled') return null;

    const settingsSnap = await tx.get(db.doc(SCRATCH_SETTINGS_DOC));
    const settings = normalizeScratchSettings(settingsSnap.exists ? (settingsSnap.data() as Partial<ScratchCouponSettings>) : null);
    if (!settings.enabled) return null;

    // 31^16 codes: a clash is practically impossible, but never overwrite one.
    let code = '';
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = generateScratchCode(random);
      if (!(await tx.get(db.collection('coupons').doc(candidate))).exists) code = candidate;
    }
    if (!code) throw new Error('Could not generate a unique coupon code');

    const issuedAt = now.toISOString();
    const { startsAt, expiresAt } = scratchCouponDates(now);
    const reward: RewardCoupon = {
      code,
      label: formatCouponDiscount(settings),
      startsAt,
      expiresAt,
      issuedAt,
    };
    tx.create(db.collection('coupons').doc(code), {
      code,
      discount: settings.discountFlat ? 0 : settings.discount,
      discountFlat: settings.discountFlat,
      flag: 'A',
      active: true,
      startsAt,
      expiresAt,
      source: 'scratch',
      sourceOrderId: order.orderId,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    });
    tx.update(orderRef, { rewardCoupon: reward, updatedAt: FieldValue.serverTimestamp() });
    return reward;
  });
}

/** Marks the scratch coupon an order paid with as used. Safe to repeat. */
export async function redeemScratchCoupon(db: Firestore, order: Pick<Order, 'orderId' | 'couponCode'>, now = new Date()): Promise<void> {
  const code = order.couponCode?.trim().toUpperCase();
  if (!code) return;
  const ref = db.collection('coupons').doc(code);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const coupon = snap.data() as Coupon;
    if (coupon.source !== 'scratch' || coupon.usedAt) return;
    const at = now.toISOString();
    tx.update(ref, { usedAt: at, usedByOrderId: order.orderId, updatedAt: at });
  });
}

/** Switches off the coupon a cancelled order earned. Safe to repeat. */
export async function invalidateRewardCoupon(db: Firestore, order: Pick<Order, 'rewardCoupon'>, now = new Date()): Promise<void> {
  const code = order.rewardCoupon?.code;
  if (!code) return;
  const ref = db.collection('coupons').doc(code);
  const snap = await ref.get();
  if (!snap.exists || snap.get('invalidatedAt')) return;
  const at = now.toISOString();
  await ref.update({ active: false, invalidatedAt: at, updatedAt: at });
}
