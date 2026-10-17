// ============================================================
// Wefton Copper — Order lifecycle (server only)
// 1. markOrderPlaced / notifyOrderPlaced: once payment succeeds or the UPI
//    screenshot is uploaded, stamp placedAt, fill in the customer and item
//    details, and email the shop and the customer.
// 2. runDailyOrderChecks (daily job): reminds the shop about orders still
//    open after 5 days, apologises to those customers once, and cancels
//    orders with no status update for 10 days.
// Only orders with lifecycleVersion 1 (created by the current checkout)
// take part, so older orders never get surprise emails or cancellations.
// ============================================================
import { FieldValue, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { toDate } from '@/lib/utils';
import {
  adminEmails,
  sendEmail,
  type OutgoingEmail,
} from '@/lib/email/sender';
import {
  adminNewOrderEmail,
  adminReminderEmail,
  customerCancelledEmail,
  customerConfirmationEmail,
  customerDelayEmail,
  type OverdueOrder,
} from '@/lib/email/orderEmails';
import type { Order, OrderItem, OrderStatusEvent, Product } from '@/types';

export const REMINDER_AFTER_DAYS = 5;
export const CANCEL_AFTER_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const PAID: Order['paymentStatus'][] = ['uploaded', 'verified'];
const CLOSED: Order['orderStatus'][] = ['delivered', 'closed', 'cancelled'];
// Shipped orders are never auto-cancelled: the goods have left.
const AUTO_CANCELLABLE: Order['orderStatus'][] = ['placed', 'confirmed', 'processing'];

const JOB_DOC = 'jobs/orderReminders';

type Send = (email: OutgoingEmail) => Promise<{ sent: boolean }>;

export function daysBetween(from: unknown, now: Date): number {
  const d = toDate(from);
  return d ? Math.floor((now.getTime() - d.getTime()) / DAY_MS) : 0;
}

/** YYYY-MM-DD in India time, so "once a day" follows the shop's day. */
export function istDate(now: Date): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function customerEmailFor(uid: string): Promise<string> {
  try {
    return (await getAdminAuth().getUser(uid)).email || '';
  } catch {
    return '';
  }
}

/** Adds Product ID and variant SKU to each line from the catalog. */
async function enrichItems(db: Firestore, items: OrderItem[]): Promise<OrderItem[]> {
  const ids = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  const products = new Map<string, Product>();
  await Promise.all(
    ids.map(async (id) => {
      const snap = await db.collection('products').doc(id).get();
      if (snap.exists) products.set(id, snap.data() as Product);
    })
  );
  return items.map((item) => {
    const product = products.get(item.productId);
    if (!product) return item;
    const variant = (product.variants || []).find((v) =>
      item.variantId ? v.variantId === item.variantId : (v.size || '') === (item.size || '') && (v.color || '') === (item.color || '')
    );
    return {
      ...item,
      productCode: item.productCode || product.productCode || '',
      sku: item.sku || variant?.sku || product.sku || '',
    };
  });
}

/**
 * Stamps a paid order as placed. Returns the order as now stored, or null
 * when the order is not eligible (old checkout, or not paid yet).
 */
export async function markOrderPlaced(db: Firestore, ref: DocumentReference, now = new Date()): Promise<Order | null> {
  const snap = await ref.get();
  if (!snap.exists) return null;
  const order = snap.data() as Order;
  if (order.lifecycleVersion !== 1 || !PAID.includes(order.paymentStatus)) return null;
  if (order.placedAt) return order;

  const at = now.toISOString();
  const products = await enrichItems(db, order.products || []);
  const email = order.customerEmail || (await customerEmailFor(order.userId));
  const event: OrderStatusEvent = {
    status: order.orderStatus,
    at,
    by: 'customer',
    note: order.paymentStatus === 'verified' ? 'Paid online' : 'UPI screenshot uploaded',
  };
  const updates = {
    placedAt: at,
    statusUpdatedAt: order.statusUpdatedAt || at,
    customerEmail: email,
    customerName: order.customerName || order.shippingAddress?.name || '',
    customerPhone: order.customerPhone || order.shippingAddress?.phone || '',
    itemCount: products.reduce((n, i) => n + (Number(i.quantity) || 0), 0),
    products,
  };

  // Only the first caller stamps placedAt (the browser and the daily job can race).
  const stamped = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (fresh.get('placedAt')) return false;
    tx.update(ref, { ...updates, statusHistory: FieldValue.arrayUnion(event), updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!stamped) return (await ref.get()).data() as Order;
  return { ...order, ...updates, statusHistory: [...(order.statusHistory || []), event] };
}

/** Sends whichever "order placed" emails haven't gone out yet. */
export async function sendPlacedEmails(ref: DocumentReference, order: Order, send: Send = sendEmail): Promise<void> {
  const n = order.notifications || {};
  const at = new Date().toISOString();
  if (!n.placedSentAt) {
    const { sent } = await send({ to: adminEmails(), ...adminNewOrderEmail(order), highPriority: true });
    if (sent) await ref.update({ 'notifications.placedSentAt': at });
  }
  if (!n.confirmationSentAt && order.customerEmail) {
    const { sent } = await send({ to: order.customerEmail, ...customerConfirmationEmail(order) });
    if (sent) await ref.update({ 'notifications.confirmationSentAt': at });
  }
}

/** Called right after payment / screenshot upload for the signed-in customer's order. */
export async function notifyOrderPlaced(db: Firestore, uid: string, orderId: string): Promise<boolean> {
  const snap = await db
    .collection('orders')
    .where('orderId', '==', orderId)
    .where('userId', '==', uid)
    .limit(1)
    .get();
  if (snap.empty) return false;
  const ref = snap.docs[0].ref;
  const order = await markOrderPlaced(db, ref);
  if (!order) return false;
  await sendPlacedEmails(ref, order);
  return true;
}

export interface DailyCheckResult {
  checked: number;
  placed: number;
  overdue: number;
  delayEmails: number;
  cancelled: number;
  digestSent: boolean;
}

export async function runDailyOrderChecks(db: Firestore, now = new Date(), send: Send = sendEmail): Promise<DailyCheckResult> {
  const snap = await db.collection('orders').where('lifecycleVersion', '==', 1).get();
  const result: DailyCheckResult = { checked: 0, placed: 0, overdue: 0, delayEmails: 0, cancelled: 0, digestSent: false };
  const overdue: OverdueOrder[] = [];
  const cancelledToday: Order[] = [];
  const at = now.toISOString();

  for (const docSnap of snap.docs) {
    const ref = docSnap.ref;
    let order = docSnap.data() as Order;
    if (CLOSED.includes(order.orderStatus)) continue;
    result.checked++;

    // Paid, but the browser never reported it (closed tab, network error).
    if (!order.placedAt) {
      if (!PAID.includes(order.paymentStatus)) continue;
      const placed = await markOrderPlaced(db, ref, now);
      if (!placed) continue;
      order = placed;
      result.placed++;
    }
    if (!order.notifications?.placedSentAt || (!order.notifications?.confirmationSentAt && order.customerEmail)) {
      await sendPlacedEmails(ref, order, send);
    }

    const age = daysBetween(order.placedAt, now);
    const idle = daysBetween(order.statusUpdatedAt || order.placedAt, now);

    if (AUTO_CANCELLABLE.includes(order.orderStatus) && idle >= CANCEL_AFTER_DAYS) {
      const event: OrderStatusEvent = { status: 'cancelled', at, by: 'system', note: `No status update for ${idle} days` };
      const paymentStatus = PAID.includes(order.paymentStatus) ? 'refund_due' : order.paymentStatus;
      await ref.update({
        orderStatus: 'cancelled',
        paymentStatus,
        autoCancelledAt: at,
        statusUpdatedAt: at,
        statusHistory: FieldValue.arrayUnion(event),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const cancelled: Order = { ...order, orderStatus: 'cancelled', paymentStatus };
      cancelledToday.push(cancelled);
      result.cancelled++;
      if (order.customerEmail && !order.notifications?.cancelSentAt) {
        const { sent } = await send({ to: order.customerEmail, ...customerCancelledEmail(cancelled) });
        if (sent) await ref.update({ 'notifications.cancelSentAt': at });
      }
      continue;
    }

    if (age >= REMINDER_AFTER_DAYS) {
      overdue.push({ order, ageDays: age });
      result.overdue++;
      if (order.customerEmail && !order.notifications?.delaySentAt) {
        const { sent } = await send({ to: order.customerEmail, ...customerDelayEmail(order) });
        if (sent) {
          await ref.update({ 'notifications.delaySentAt': at });
          result.delayEmails++;
        }
      }
    }
  }

  // One digest per India day, even if the job runs twice.
  if (overdue.length || cancelledToday.length) {
    const jobRef = db.doc(JOB_DOC);
    const today = istDate(now);
    const job = await jobRef.get();
    if (job.get('lastDigestDate') !== today) {
      overdue.sort((a, b) => b.ageDays - a.ageDays);
      const { sent } = await send({ to: adminEmails(), ...adminReminderEmail(overdue, cancelledToday), highPriority: true });
      if (sent) {
        await jobRef.set({ lastDigestDate: today, lastDigestAt: at }, { merge: true });
        result.digestSent = true;
      }
    }
  }

  await db.doc(JOB_DOC).set({ lastRunAt: at, lastResult: result }, { merge: true });
  return result;
}
