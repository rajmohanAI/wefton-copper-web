// ============================================================
// Wefton Copper — Order Service (Firestore)
// ============================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  deleteField,
  runTransaction,
  type Transaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';
import type { Order, CartItem, Address, OrderStatusEvent, RewardCoupon } from '@/types';
import { generateOrderId } from '@/lib/utils';
import { computeOrderTotals } from '@/lib/orderPricing';
import { applyStockMoves, planStockMoves, type StockedProduct, type StockMove } from '@/lib/orderStock';

const ORDERS_COL = 'orders';

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

export async function createOrder(
  userId: string,
  items: CartItem[],
  shippingAddress: Address,
  discount = 0,
  couponCode = '',
  customerEmail = '',
  discountFlat = 0
): Promise<Order> {
  const db = requireDb();
  const { subtotal, discountAmount, shipping, taxes, total } = computeOrderTotals(items, discount, discountFlat);

  const orderData = {
    orderId: generateOrderId(),
    userId,
    products: items.map((i) => ({
      productId: i.productId,
      title: i.title,
      image: i.image || '',
      price: i.price,
      quantity: i.quantity,
      size: i.size || '',
      color: i.color || '',
      // Lets the payment server re-price the line from the catalog.
      variantId: i.variantId || '',
    })),
    // Kept so the payment server can re-check the discount.
    couponCode: discountAmount > 0 ? couponCode : '',
    subtotal,
    discountAmount,
    shipping,
    taxes,
    total,
    paymentStatus: 'pending' as const,
    orderStatus: 'placed' as const,
    shippingAddress: {
      addressId: shippingAddress.addressId || '',
      name: shippingAddress.name || '',
      phone: shippingAddress.phone || '',
      email: shippingAddress.email || '',
      line1: shippingAddress.line1 || '',
      line2: shippingAddress.line2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      pincode: shippingAddress.pincode || '',
      country: shippingAddress.country || 'India',
      isDefault: shippingAddress.isDefault || false,
    },
    paymentMethod: 'qr' as const,
    // Takes part in the placed / reminder / wait-or-cancel emails (see orderLifecycleServer).
    lifecycleVersion: 1,
    customerEmail,
    customerName: shippingAddress.name || '',
    customerPhone: shippingAddress.phone || '',
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, ORDERS_COL), orderData);
  return { ...orderData, createdAt: new Date().toISOString() } as unknown as Order;
}

export async function uploadPaymentScreenshot(
  orderId: string,
  userId: string,
  file: File,
  reference: string
): Promise<void> {
  const db = requireDb();
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Firebase Storage not configured');

  const storageRef = ref(storage, `payments/${orderId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // The userId filter is required: security rules only let a user query their own orders.
  const q = query(
    collection(db, ORDERS_COL),
    where('orderId', '==', orderId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, {
      paymentStatus: 'uploaded',
      paymentScreenshot: url,
      paymentReference: reference,
    });
  }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const db = requireDb();
  const q = query(
    collection(db, ORDERS_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Order), productId: d.id }));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, ORDERS_COL, id));
  if (!snap.exists()) return null;
  return snap.data() as Order;
}

export async function getAllOrders(): Promise<Order[]> {
  const db = requireDb();
  const q = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Order), productId: d.id }));
}

/** Reads the given products inside a transaction. */
async function readProducts(tx: Transaction, ids: string[]): Promise<Map<string, StockedProduct>> {
  const db = requireDb();
  const products = new Map<string, StockedProduct>();
  for (const id of [...new Set(ids.filter(Boolean))]) {
    const snap = await tx.get(doc(db, 'products', id));
    if (snap.exists()) products.set(id, snap.data() as StockedProduct);
  }
  return products;
}

/** Writes stock moves to the products: -1 takes stock, +1 puts it back. */
async function moveStock(tx: Transaction, moves: StockMove[], direction: -1 | 1, at: string): Promise<void> {
  const db = requireDb();
  const products = await readProducts(tx, moves.map((m) => m.productId));
  const { updates, shortfalls } = applyStockMoves(moves, products, direction);
  if (shortfalls.length) console.warn('[Stock] More ordered than in stock:', shortfalls.join(', '));
  for (const [id, stock] of updates) {
    tx.update(doc(db, 'products', id), { inventory: stock.inventory, variants: stock.variants, updatedAt: at });
  }
}

const OPEN_FOR_STOCK: Order['orderStatus'][] = ['placed', 'confirmed', 'processing'];

/**
 * True for a paid, open order that never took its items out of stock
 * (orders placed before stock tracking). The admin can take them once.
 */
export function needsStockTaken(order: Order): boolean {
  return (
    !order.stockDeductedAt &&
    (order.paymentStatus === 'verified' || order.paymentStatus === 'uploaded') &&
    OPEN_FOR_STOCK.includes(order.orderStatus)
  );
}

/** Takes an older order's items out of stock, once. Returns false if it already had. */
export async function takeOrderStock(docId: string): Promise<boolean> {
  const db = requireDb();
  const orderRef = doc(db, ORDERS_COL, docId);
  const at = new Date().toISOString();
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    const order = snap.data() as Order | undefined;
    if (!order || !needsStockTaken(order)) return false;
    const items = order.products || [];
    const products = await readProducts(tx, items.map((i) => i.productId));
    const moves = planStockMoves(items, products);
    const { updates, shortfalls } = applyStockMoves(moves, products, -1);
    if (shortfalls.length) console.warn('[Stock] More ordered than in stock:', shortfalls.join(', '));
    for (const [id, stock] of updates) {
      tx.update(doc(db, 'products', id), { inventory: stock.inventory, variants: stock.variants, updatedAt: at });
    }
    tx.update(orderRef, { stockDeductedAt: at, stockMoves: moves, updatedAt: serverTimestamp() });
    return true;
  });
}

export async function updateOrderStatus(
  docId: string,
  orderStatus: Order['orderStatus'],
  paymentStatus?: Order['paymentStatus'],
  extra: Record<string, unknown> = {}
): Promise<void> {
  const db = requireDb();
  const at = new Date().toISOString();
  const event: OrderStatusEvent = { status: orderStatus, at, by: 'admin' };
  const updates: Record<string, unknown> = {
    ...extra,
    orderStatus,
    statusUpdatedAt: at,
    statusHistory: arrayUnion(event),
    updatedAt: serverTimestamp(),
  };
  if (orderStatus === 'closed') updates.closedAt = at;
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  const orderRef = doc(db, ORDERS_COL, docId);

  await runTransaction(db, async (tx) => {
    const order = (await tx.get(orderRef)).data() as Order | undefined;
    const moves = order?.stockMoves || [];
    if (order?.stockDeductedAt && moves.length) {
      if (orderStatus === 'cancelled' && !order.stockRestoredAt) {
        // A cancelled order's items go back into stock.
        await moveStock(tx, moves, 1, at);
        updates.stockRestoredAt = at;
      } else if (orderStatus !== 'cancelled' && order.orderStatus === 'cancelled' && order.stockRestoredAt) {
        // Re-opening a cancelled order takes the items out of stock again.
        await moveStock(tx, moves, -1, at);
        updates.stockRestoredAt = deleteField();
      }
    }
    tx.update(orderRef, updates);
    // Cancelling an order switches off the scratch card coupon it earned, in the same write.
    const rewardCode = orderStatus === 'cancelled' ? order?.rewardCoupon?.code : undefined;
    if (rewardCode) {
      tx.update(doc(db, 'coupons', rewardCode), { active: false, invalidatedAt: at, updatedAt: at });
    }
  });
}

/** Asks the server for the scratch card coupon this order earned. Null when there is none. */
export async function fetchRewardCoupon(orderId: string): Promise<RewardCoupon | null> {
  const token = await getFirebaseAuth()?.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again');
  const res = await fetch('/api/orders/reward', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as { reward?: RewardCoupon | null; error?: string };
  if (!res.ok) throw new Error(data.error || 'Could not load your reward');
  return data.reward ?? null;
}

/**
 * Tells the server the customer has paid (UPI screenshot uploaded) so it
 * can send the order emails. Best effort: the daily job catches misses.
 */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  try {
    const token = await getFirebaseAuth()?.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/orders/placed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    });
  } catch (error) {
    console.warn('[Orders] Could not report the placed order:', error);
  }
}
