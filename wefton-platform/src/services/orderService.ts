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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';
import type { Order, CartItem, Address } from '@/types';
import { generateOrderId } from '@/lib/utils';
import { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, TAX_RATE } from '@/config/brand';

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
  discount = 0
): Promise<Order> {
  const db = requireDb();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const taxes = Math.round((subtotal - discountAmount) * TAX_RATE);
  const total = subtotal - discountAmount + shipping + taxes;

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
    })),
    subtotal,
    shipping,
    taxes,
    total,
    paymentStatus: 'pending' as const,
    orderStatus: 'placed' as const,
    shippingAddress: {
      addressId: shippingAddress.addressId || '',
      name: shippingAddress.name || '',
      phone: shippingAddress.phone || '',
      line1: shippingAddress.line1 || '',
      line2: shippingAddress.line2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      pincode: shippingAddress.pincode || '',
      country: shippingAddress.country || 'India',
      isDefault: shippingAddress.isDefault || false,
    },
    paymentMethod: 'qr' as const,
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, ORDERS_COL), orderData);
  return { ...orderData, createdAt: new Date().toISOString() } as unknown as Order;
}

export async function uploadPaymentScreenshot(
  orderId: string,
  file: File,
  reference: string
): Promise<void> {
  const db = requireDb();
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Firebase Storage not configured');

  const storageRef = ref(storage, `payments/${orderId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const q = query(collection(db, ORDERS_COL), where('orderId', '==', orderId));
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
  paymentStatus?: Order['paymentStatus']
): Promise<void> {
  const db = requireDb();
  const updates: Record<string, unknown> = {
    orderStatus,
    updatedAt: serverTimestamp(),
  };
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  await updateDoc(doc(db, ORDERS_COL, docId), updates);
}
