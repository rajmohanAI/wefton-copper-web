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
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';
import type { Order, CartItem, Address, OrderStatusEvent, RewardCoupon } from '@/types';
import { generateOrderId } from '@/lib/utils';
import { computeOrderTotals } from '@/lib/orderPricing';

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
    // Takes part in the placed / reminder / auto-cancel emails (see orderLifecycleServer).
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

  // Cancelling an order switches off the scratch card coupon it earned, in the same write.
  const rewardCode = orderStatus === 'cancelled'
    ? ((await getDoc(orderRef)).data() as Order | undefined)?.rewardCoupon?.code
    : undefined;
  if (!rewardCode) {
    await updateDoc(orderRef, updates);
    return;
  }
  const batch = writeBatch(db);
  batch.update(orderRef, updates);
  batch.update(doc(db, 'coupons', rewardCode), { active: false, invalidatedAt: at, updatedAt: at });
  await batch.commit();
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
