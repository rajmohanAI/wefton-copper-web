// ============================================================
// Wefton Copper — Razorpay payment flow (server only)
// 1. prepareRazorpayOrder: re-prices the customer's Firestore order from the
//    catalog, then creates (or reuses) a Razorpay order for that amount.
// 2. confirmRazorpayPayment: verifies the signature Checkout returns and
//    marks the Firestore order paid.
// Only the server writes the Razorpay fields and the "verified" status
// (Firestore rules stop customers from doing either).
// ============================================================
import { FieldValue, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { computeOrderTotals } from '@/lib/orderPricing';
import {
  RAZORPAY_CURRENCY,
  createRazorpayClient,
  getRazorpayConfig,
  toPaise,
  verifyPaymentSignature,
} from '@/lib/razorpay/server';
import type { Coupon, Order, OrderItem, Product } from '@/types';

export class PaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface PreparedRazorpayOrder {
  keyId: string;
  orderId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

type StoredOrder = Order & { razorpayAmount?: number };

function requireConfig() {
  const config = getRazorpayConfig();
  if (!config) throw new PaymentError(503, 'Online payment is not configured');
  return config;
}

async function loadOwnedOrder(
  db: Firestore,
  uid: string,
  orderId: string
): Promise<{ ref: DocumentReference; order: StoredOrder }> {
  const snap = await db
    .collection('orders')
    .where('orderId', '==', orderId)
    .where('userId', '==', uid)
    .limit(1)
    .get();
  if (snap.empty) throw new PaymentError(404, 'Order not found');
  const docSnap = snap.docs[0];
  return { ref: docSnap.ref, order: docSnap.data() as StoredOrder };
}

/** Same rule as the product page: the variant's price if set, else the product's. */
function catalogPrice(product: Product, line: OrderItem): number {
  const variants = product.variants ?? [];
  const variant = line.variantId
    ? variants.find((v) => v.variantId === line.variantId)
    : variants.find(
        (v) => (v.size || '') === (line.size || '') && (!line.color || v.color === line.color)
      );
  return variant?.price || product.price;
}

async function couponDiscount(db: Firestore, code: string | undefined): Promise<number> {
  if (!code) return 0;
  const snap = await db
    .collection('coupons')
    .where('code', '==', code.toUpperCase())
    .where('active', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return 0;
  const coupon = snap.docs[0].data() as Coupon;
  if (coupon.expiresAt) {
    const raw = coupon.expiresAt as unknown;
    const expires =
      typeof raw === 'string' ? new Date(raw) : (raw as { toDate: () => Date }).toDate();
    if (expires.getTime() < Date.now()) return 0;
  }
  return coupon.discount || 0;
}

/**
 * The order total recomputed from current catalog prices and the coupon,
 * ignoring the prices the browser wrote into the order.
 */
export async function computeTrustedTotal(db: Firestore, order: Order): Promise<number> {
  if (!order.products?.length) throw new PaymentError(400, 'Order has no items');
  const lines = await Promise.all(
    order.products.map(async (line) => {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new PaymentError(400, 'Order has an invalid quantity');
      }
      const snap = await db.collection('products').doc(line.productId).get();
      if (!snap.exists) throw new PaymentError(409, 'A product in this order is no longer available');
      const product = snap.data() as Product;
      return { price: catalogPrice(product, line), quantity: line.quantity };
    })
  );
  const discount = await couponDiscount(db, order.couponCode);
  return computeOrderTotals(lines, discount).total;
}

export async function prepareRazorpayOrder(
  uid: string,
  orderId: string
): Promise<PreparedRazorpayOrder> {
  const config = requireConfig();
  const db = getAdminDb();
  const { ref, order } = await loadOwnedOrder(db, uid, orderId);

  if (order.paymentStatus !== 'pending') {
    throw new PaymentError(409, 'This order is not awaiting payment');
  }

  const trustedTotal = await computeTrustedTotal(db, order);
  if (Math.abs(trustedTotal - order.total) > 0.01) {
    throw new PaymentError(409, 'Prices have changed since this order was placed. Please check out again.');
  }
  const amount = toPaise(trustedTotal);

  // Reuse the Razorpay order on a retry so one checkout maps to one Razorpay order.
  if (order.razorpayOrderId && order.razorpayAmount === amount) {
    return { keyId: config.keyId, orderId, razorpayOrderId: order.razorpayOrderId, amount, currency: RAZORPAY_CURRENCY };
  }

  const razorpay = createRazorpayClient(config);
  const created = await razorpay.orders.create({
    amount,
    currency: RAZORPAY_CURRENCY,
    receipt: orderId.slice(0, 40),
    notes: { orderId, userId: uid },
  });

  await ref.update({
    razorpayOrderId: created.id,
    razorpayAmount: amount,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { keyId: config.keyId, orderId, razorpayOrderId: created.id, amount, currency: RAZORPAY_CURRENCY };
}

export async function confirmRazorpayPayment(
  uid: string,
  orderId: string,
  response: RazorpayPaymentResponse
): Promise<void> {
  const config = requireConfig();
  const db = getAdminDb();
  const { ref, order } = await loadOwnedOrder(db, uid, orderId);

  if (!order.razorpayOrderId || order.razorpayOrderId !== response.razorpay_order_id) {
    throw new PaymentError(400, 'Payment does not belong to this order');
  }

  const valid = verifyPaymentSignature(
    response.razorpay_order_id,
    response.razorpay_payment_id,
    response.razorpay_signature,
    config.keySecret
  );
  if (!valid) throw new PaymentError(400, 'Payment signature verification failed');

  // Already recorded (e.g. the browser retried the request).
  if (order.paymentStatus === 'verified' && order.razorpayPaymentId === response.razorpay_payment_id) {
    return;
  }

  await ref.update({
    paymentStatus: 'verified',
    orderStatus: 'confirmed',
    paymentMethod: 'razorpay',
    paymentReference: response.razorpay_payment_id,
    razorpayPaymentId: response.razorpay_payment_id,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
