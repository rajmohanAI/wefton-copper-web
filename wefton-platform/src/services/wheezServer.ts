// ============================================================
// Wefton Copper — Wheez server helpers (Admin SDK, server only)
// ============================================================
import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import {
  contactMatchesOrder,
  deliveredAt,
  orderStatusLabel,
  returnWindow,
  toDate,
  type WheezOrderSummary,
} from '@/lib/wheez';

export type { WheezOrderSummary };

export function summarizeOrder(data: DocumentData, now: Date = new Date()): WheezOrderSummary {
  const placed = toDate(data.placedAt) ?? toDate(data.createdAt);
  const delivered = deliveredAt(data);
  return {
    orderId: String(data.orderId || ''),
    status: String(data.orderStatus || ''),
    statusLabel: orderStatusLabel(String(data.orderStatus || '')),
    placedAt: placed ? placed.toISOString() : null,
    deliveredAt: delivered ? delivered.toISOString() : null,
    trackingNumber: String(data.trackingNumber || ''),
    items: (Array.isArray(data.products) ? data.products : []).map((p: DocumentData) => ({
      title: String(p.title || ''),
      size: String(p.size || ''),
      color: String(p.color || ''),
      quantity: Number(p.quantity || 1),
      productId: String(p.productId || ''),
    })),
    returnWindow: returnWindow(data, now),
  };
}

/**
 * Finds an order the caller may see: their own order when signed in, or
 * any order whose email / phone matches `contact`. Returns null otherwise,
 * the same as for an order that does not exist, so order numbers can't be probed.
 */
export async function findAccessibleOrder(
  db: Firestore,
  orderId: string,
  uid: string | null,
  contact: string,
): Promise<DocumentData | null> {
  const id = orderId.trim().toUpperCase();
  if (!id) return null;
  const snap = await db.collection('orders').where('orderId', '==', id).limit(1).get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  if (uid && data.userId === uid) return data;
  if (contact && contactMatchesOrder(data, contact)) return data;
  return null;
}

/** The signed-in customer's most recent orders. */
export async function recentOrders(db: Firestore, uid: string, limit = 5): Promise<DocumentData[]> {
  const snap = await db.collection('orders').where('userId', '==', uid).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))
    .slice(0, limit);
}
