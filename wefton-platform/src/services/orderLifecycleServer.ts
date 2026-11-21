// ============================================================
// Wefton Copper — Order lifecycle (server only)
// 1. markOrderPlaced / notifyOrderPlaced: once payment succeeds or the UPI
//    screenshot is uploaded, stamp placedAt, fill in the customer and item
//    details, and email the shop and the customer.
// 2. runDailyOrderChecks (daily job): reminds the shop about orders still
//    open after 5 days and apologises to those customers once. At 10 days
//    the customer is asked to wait or cancel for a refund (WC-Issue-20);
//    nothing is cancelled without the customer asking.
// 3. respondToOrderChoice: the customer's answer, from /order-response.
// Only orders with lifecycleVersion 1 (created by the current checkout)
// take part, so older orders never get surprise emails or cancellations.
// ============================================================
import { FieldValue, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { toDate } from '@/lib/utils';
import {
  adminEmails,
  sendEmail,
  type OutgoingEmail,
} from '@/lib/email/sender';
import {
  SITE,
  adminCustomerCancelledEmail,
  adminNewOrderEmail,
  adminReminderEmail,
  customerCancelledEmail,
  customerConfirmationEmail,
  customerDelayEmail,
  customerOrderChoiceEmail,
  type OrderChoiceLinks,
  type OverdueOrder,
} from '@/lib/email/orderEmails';
import { orderChoiceToken, type OrderChoice } from '@/lib/orderResponse';
import { invalidateRewardCoupon, redeemScratchCoupon } from '@/services/scratchCouponServer';
import { applyStockMoves, planStockMoves, type StockedProduct, type StockMove } from '@/lib/orderStock';
import type { Order, OrderItem, OrderStatusEvent, Product } from '@/types';

export const REMINDER_AFTER_DAYS = 5;
/** Days after placing (and after each "I'll wait") before the customer is asked to wait or cancel. */
export const CHOICE_AFTER_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const PAID: Order['paymentStatus'][] = ['uploaded', 'verified'];
const CLOSED: Order['orderStatus'][] = ['delivered', 'closed', 'cancelled'];
// Only these can still be cancelled by the customer: once shipped, the goods have left.
const CANCELLABLE: Order['orderStatus'][] = ['placed', 'confirmed', 'processing'];

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

/** Adds Product ID, variant SKU and HSN code to each line from the catalog. */
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
      hsnCode: item.hsnCode || product.hsnCode || '',
    };
  });
}

/** Reads the products an order touches, inside a transaction (reads must come before writes). */
async function readStockedProducts(
  db: Firestore,
  tx: Transaction,
  productIds: string[]
): Promise<Map<string, StockedProduct>> {
  const products = new Map<string, StockedProduct>();
  for (const id of [...new Set(productIds.filter(Boolean))]) {
    const snap = await tx.get(db.collection('products').doc(id));
    if (snap.exists) products.set(id, snap.data() as StockedProduct);
  }
  return products;
}

function writeStock(db: Firestore, tx: Transaction, change: ReturnType<typeof applyStockMoves>, at: string) {
  for (const [id, stock] of change.updates) {
    tx.update(db.collection('products').doc(id), { inventory: stock.inventory, variants: stock.variants, updatedAt: at });
  }
}

/**
 * Puts back the stock a cancelled order took, in the same transaction as the
 * cancellation. Does nothing if the order never took stock or already gave it back.
 */
export async function restoreStockInTx(
  db: Firestore,
  tx: Transaction,
  order: Pick<Order, 'orderId' | 'stockDeductedAt' | 'stockRestoredAt' | 'stockMoves'>,
  at: string
): Promise<Record<string, unknown>> {
  const moves: StockMove[] = order.stockMoves || [];
  if (!order.stockDeductedAt || order.stockRestoredAt || !moves.length) return {};
  const products = await readStockedProducts(db, tx, moves.map((m) => m.productId));
  writeStock(db, tx, applyStockMoves(moves, products, 1), at);
  return { stockRestoredAt: at };
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

  // Only the first caller stamps placedAt (the browser and the daily job can
  // race), and the same transaction takes the items out of stock, so stock
  // drops exactly once per order.
  let stockFields: Partial<Order> = {};
  const stamped = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (fresh.get('placedAt')) return false;
    stockFields = {};
    if (!fresh.get('stockDeductedAt')) {
      const items = (fresh.get('products') as OrderItem[] | undefined) || [];
      const products = await readStockedProducts(db, tx, items.map((i) => i.productId));
      const moves = planStockMoves(items, products);
      const change = applyStockMoves(moves, products, -1);
      if (change.shortfalls.length) {
        console.warn(`[Stock] ${order.orderId} ordered more than in stock: ${change.shortfalls.join(', ')}`);
      }
      writeStock(db, tx, change, at);
      stockFields = { stockDeductedAt: at, stockMoves: moves };
    }
    tx.update(ref, { ...updates, ...stockFields, statusHistory: FieldValue.arrayUnion(event), updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!stamped) return (await ref.get()).data() as Order;
  // A scratch card coupon works once: this order uses it up.
  await redeemScratchCoupon(db, order, now).catch((error) =>
    console.error(`[Coupons] Marking ${order.couponCode} used by ${order.orderId} failed:`, error)
  );
  return { ...order, ...updates, ...stockFields, statusHistory: [...(order.statusHistory || []), event] };
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
  /** "Wait or cancel?" emails sent this run. */
  choiceEmails: number;
  digestSent: boolean;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || SITE).replace(/\/$/, '');
}

/** The two buttons in the wait-or-cancel email. Null without a signing secret. */
export function orderChoiceLinks(orderDocId: string): OrderChoiceLinks | null {
  const token = orderChoiceToken(orderDocId);
  if (!token) return null;
  const base = `${siteUrl()}/order-response?t=${encodeURIComponent(token)}`;
  return { wait: `${base}&choice=wait`, cancel: `${base}&choice=cancel` };
}

/**
 * Ask on day 10 after placing, and again 10 days after each "I'll wait".
 * Never while the last question is unanswered, and never once shipped.
 */
export function shouldAskChoice(order: Order, now: Date): boolean {
  if (!CANCELLABLE.includes(order.orderStatus) || !order.customerEmail) return false;
  if (daysBetween(order.placedAt, now) < CHOICE_AFTER_DAYS) return false;
  const asked = order.notifications?.choiceSentAt;
  if (!asked) return true;
  if (order.customerChoice !== 'wait' || !order.customerChoiceAt) return false;
  return order.customerChoiceAt >= asked && daysBetween(order.customerChoiceAt, now) >= CHOICE_AFTER_DAYS;
}

export async function runDailyOrderChecks(db: Firestore, now = new Date(), send: Send = sendEmail): Promise<DailyCheckResult> {
  const snap = await db.collection('orders').where('lifecycleVersion', '==', 1).get();
  const result: DailyCheckResult = { checked: 0, placed: 0, overdue: 0, delayEmails: 0, choiceEmails: 0, digestSent: false };
  const overdue: OverdueOrder[] = [];
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

    if (shouldAskChoice(order, now)) {
      const links = orderChoiceLinks(ref.id);
      if (links) {
        const { sent } = await send({ to: order.customerEmail!, ...customerOrderChoiceEmail(order, links) });
        if (sent) {
          await ref.update({ 'notifications.choiceSentAt': at });
          order = { ...order, notifications: { ...order.notifications, choiceSentAt: at } };
          result.choiceEmails++;
        }
      } else {
        console.error('[Orders] No ORDER_LINK_SECRET or CRON_SECRET: cannot send the wait-or-cancel email');
      }
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
  if (overdue.length) {
    const jobRef = db.doc(JOB_DOC);
    const today = istDate(now);
    const job = await jobRef.get();
    if (job.get('lastDigestDate') !== today) {
      overdue.sort((a, b) => b.ageDays - a.ageDays);
      const { sent } = await send({ to: adminEmails(), ...adminReminderEmail(overdue), highPriority: true });
      if (sent) {
        await jobRef.set({ lastDigestDate: today, lastDigestAt: at }, { merge: true });
        result.digestSent = true;
      }
    }
  }

  await db.doc(JOB_DOC).set({ lastRunAt: at, lastResult: result }, { merge: true });
  return result;
}


/** What the /order-response page shows, and what an answer did. */
export type OrderChoiceState =
  | 'open' // can still wait or cancel
  | 'waiting' // the customer said they'll wait
  | 'cancelled' // cancelled (by the customer or otherwise)
  | 'shipped' // on its way: too late to cancel
  | 'closed' // delivered or closed
  | 'not_found';

export interface OrderChoiceView {
  state: OrderChoiceState;
  orderId?: string;
  placedAt?: string;
  total?: number;
  paid?: boolean;
  /** The customer cancelled it themselves. */
  cancelledByCustomer?: boolean;
}

function viewOf(order: Order | undefined): OrderChoiceView {
  if (!order) return { state: 'not_found' };
  const base = {
    orderId: order.orderId,
    placedAt: order.placedAt || order.createdAt,
    total: order.total,
    paid: PAID.includes(order.paymentStatus) || order.paymentStatus === 'refund_due',
    cancelledByCustomer: order.customerChoice === 'cancel',
  };
  if (order.orderStatus === 'cancelled') return { ...base, state: 'cancelled' };
  if (order.orderStatus === 'shipped') return { ...base, state: 'shipped' };
  if (CLOSED.includes(order.orderStatus)) return { ...base, state: 'closed' };
  if (order.customerChoice === 'wait' && order.customerChoiceAt && order.customerChoiceAt >= (order.notifications?.choiceSentAt || '')) {
    return { ...base, state: 'waiting' };
  }
  return { ...base, state: 'open' };
}

export async function getOrderChoiceView(db: Firestore, orderDocId: string): Promise<OrderChoiceView> {
  const snap = await db.collection('orders').doc(orderDocId).get();
  return viewOf(snap.exists ? (snap.data() as Order) : undefined);
}

/**
 * The customer's answer to the wait-or-cancel email. Safe to call twice:
 * a second "cancel" does nothing, and a shipped or closed order is never
 * cancelled. Cancelling puts the stock back, switches off the order's
 * scratch card coupon, and emails the customer and the shop.
 */
export async function respondToOrderChoice(
  db: Firestore,
  orderDocId: string,
  choice: OrderChoice,
  now = new Date(),
  send: Send = sendEmail
): Promise<OrderChoiceView> {
  const ref = db.collection('orders').doc(orderDocId);
  const at = now.toISOString();

  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { view: viewOf(undefined), changed: false };
    const order = snap.data() as Order;
    const view = viewOf(order);
    if (view.state !== 'open' && view.state !== 'waiting') return { view, changed: false };

    if (choice === 'wait') {
      if (view.state === 'waiting') return { view, changed: false };
      const event: OrderStatusEvent = { status: order.orderStatus, at, by: 'customer', note: 'Happy to wait longer for the delayed order' };
      tx.update(ref, { customerChoice: 'wait', customerChoiceAt: at, statusHistory: FieldValue.arrayUnion(event), updatedAt: FieldValue.serverTimestamp() });
      const updated: Order = { ...order, customerChoice: 'wait', customerChoiceAt: at };
      return { view: viewOf(updated), changed: false };
    }

    const paymentStatus: Order['paymentStatus'] = PAID.includes(order.paymentStatus) ? 'refund_due' : order.paymentStatus;
    const event: OrderStatusEvent = { status: 'cancelled', at, by: 'customer', note: 'Cancelled by the customer from the delay email' };
    // Reads come before writes: restoreStockInTx reads the products first.
    const stockFields = await restoreStockInTx(db, tx, order, at);
    tx.update(ref, {
      orderStatus: 'cancelled',
      paymentStatus,
      customerChoice: 'cancel',
      customerChoiceAt: at,
      statusUpdatedAt: at,
      ...stockFields,
      statusHistory: FieldValue.arrayUnion(event),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const cancelled: Order = { ...order, orderStatus: 'cancelled', paymentStatus, customerChoice: 'cancel', customerChoiceAt: at };
    return { view: viewOf(cancelled), changed: true, order: cancelled };
  });

  if (outcome.changed && outcome.order) {
    const order = outcome.order;
    await invalidateRewardCoupon(db, order, now).catch((error) =>
      console.error(`[Coupons] Switching off the reward coupon of ${order.orderId} failed:`, error)
    );
    if (order.customerEmail && !order.notifications?.cancelSentAt) {
      const { sent } = await send({ to: order.customerEmail, ...customerCancelledEmail(order, { byCustomer: true }) });
      if (sent) await ref.update({ 'notifications.cancelSentAt': at });
    }
    const { sent } = await send({ to: adminEmails(), ...adminCustomerCancelledEmail(order), highPriority: true });
    if (sent) await ref.update({ 'notifications.customerCancelSentAt': at });
  }
  return outcome.view;
}
