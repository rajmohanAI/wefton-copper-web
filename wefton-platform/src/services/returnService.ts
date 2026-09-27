// ============================================================
// Wefton Copper — Return Service (Return/Refund CRUD)
// ============================================================

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { ReturnRequest, ReturnStatus } from '@/types';

const RETURNS_COL = 'returns';

/**
 * Determines if a return request can be filed for a given order.
 * Returns true only if the order status is "delivered" AND the delivery
 * date is within 7 days of the current date.
 */
export function isReturnEligible(
  orderStatus: string,
  deliveryDate: string | Date
): boolean {
  if (orderStatus !== 'delivered') return false;
  const delivered = new Date(deliveryDate);
  const now = new Date();
  const diffMs = now.getTime() - delivered.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

/**
 * Creates a new return request document in Firestore.
 * Sets status to "pending" and adds server timestamps for createdAt/updatedAt.
 * Returns the generated document ID.
 */
export async function createReturnRequest(
  data: Omit<ReturnRequest, 'returnId' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const ref = await addDoc(collection(db, RETURNS_COL), {
    ...data,
    status: 'pending' as ReturnStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Updates the status of an existing return request.
 * If status is "rejected", a rejectionReason of at least 10 characters is required.
 */
export async function updateReturnStatus(
  returnId: string,
  status: ReturnStatus,
  rejectionReason?: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  if (status === 'rejected') {
    if (!rejectionReason || rejectionReason.length < 10) {
      throw new Error('Rejection reason must be at least 10 characters');
    }
  }

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'rejected' && rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }

  await updateDoc(doc(db, RETURNS_COL, returnId), updateData);
}

/**
 * Retrieves all return requests, optionally filtered by status.
 * Results are sorted by createdAt descending (newest first).
 */
export async function getReturnsByStatus(
  status?: ReturnStatus
): Promise<ReturnRequest[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const constraints: QueryConstraint[] = [];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, RETURNS_COL), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    returnId: d.id,
    ...(d.data() as Omit<ReturnRequest, 'returnId'>),
  }));
}

/**
 * Retrieves all return requests for a specific customer.
 * Results are sorted by createdAt descending (newest first).
 */
export async function getCustomerReturns(
  customerId: string
): Promise<ReturnRequest[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, RETURNS_COL),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    returnId: d.id,
    ...(d.data() as Omit<ReturnRequest, 'returnId'>),
  }));
}
