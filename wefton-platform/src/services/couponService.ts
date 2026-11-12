// ============================================================
// Wefton Copper — Coupon Service (Firestore CRUD + Validation)
// ============================================================
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { couponSchema } from '@/lib/schemas';
import { couponWindow, isPublicCoupon } from '@/lib/coupons';
import type { Coupon } from '@/types';

const COUPONS_COL = 'coupons';

export interface CouponValidationResult {
  valid: boolean;
  discount?: number;
  discountFlat?: number;
  error?: string;
}

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

// ============================================================
// CRUD Operations
// ============================================================

/**
 * Fetches all coupons from Firestore, sorted by the specified field and direction.
 * Supports sorting by code, discount, or expiresAt.
 *
 * @param sortField - The field to sort by (default: 'code')
 * @param sortDir - Sort direction: 'asc' or 'desc' (default: 'asc')
 * @returns Array of Coupon objects
 * Requirements: 13.1, 13.7
 */
export async function getCoupons(
  sortField: 'code' | 'discount' | 'expiresAt' = 'code',
  sortDir: 'asc' | 'desc' = 'asc'
): Promise<Coupon[]> {
  const db = requireDb();

  const q = query(collection(db, COUPONS_COL), orderBy(sortField, sortDir));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    couponId: d.id,
    ...(d.data() as Omit<Coupon, 'couponId'>),
  }));
}

/**
 * Checks if a coupon code already exists in Firestore (case-insensitive).
 *
 * @param code - The coupon code to check
 * @returns true if the code already exists, false otherwise
 * Requirements: 13.4
 */
export async function couponCodeExists(code: string): Promise<boolean> {
  const db = requireDb();

  const q = query(
    collection(db, COUPONS_COL),
    where('code', '==', code.toUpperCase())
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Creates a new coupon after Zod validation and uniqueness check.
 * The code is automatically uppercased via the Zod schema transform.
 *
 * @param data - Coupon creation data (code, discount, active, expiresAt)
 * @returns The new coupon's document ID
 * @throws Error if validation fails or coupon code already exists
 * Requirements: 13.2, 13.3, 13.4
 */
export async function createCoupon(
  data: {
    code: string;
    discount: number;
    discountFlat?: number;
    flag?: 'A' | 'S';
    active?: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
  }
): Promise<string> {
  const db = requireDb();

  // Validate with Zod
  const parsed = couponSchema.parse(data);

  // Check uniqueness
  const exists = await couponCodeExists(parsed.code);
  if (exists) throw new Error('Coupon code already exists');

  const ref = await addDoc(collection(db, COUPONS_COL), {
    ...parsed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Updates a coupon's discount, active status, or validity dates.
 * The coupon code is read-only and cannot be changed.
 *
 * @param couponId - The Firestore document ID of the coupon
 * @param data - Partial update of the discount, active status and dates
 * Requirements: 13.5
 */
export async function updateCoupon(
  couponId: string,
  data: Partial<Pick<Coupon, 'discount' | 'discountFlat' | 'flag' | 'active' | 'startsAt' | 'expiresAt'>>
): Promise<void> {
  const db = requireDb();

  await updateDoc(doc(db, COUPONS_COL, couponId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a coupon document from Firestore.
 *
 * @param couponId - The Firestore document ID of the coupon to delete
 * Requirements: 13.6
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, COUPONS_COL, couponId));
}

// ============================================================
// Validation (for checkout flow)
// ============================================================

/**
 * Validates a coupon code against the Firestore `coupons` collection.
 *
 * - Queries for a document where `code == input.toUpperCase()` and `active == true`
 * - If not found, returns `{ valid: false, error: "Invalid coupon code" }`
 * - If found but expired (`expiresAt` is in the past), returns `{ valid: false, error: "Coupon has expired" }`
 * - If valid, returns `{ valid: true, discount: doc.discount }`
 *
 * @param code - The coupon code string entered by the user
 * @returns A promise resolving to the validation result
 */
export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  const res = await fetch('/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    cache: 'no-store',
  });
  return (await res.json()) as CouponValidationResult;
}

/**
 * Coupons any customer can see at checkout: enabled, flagged 'S', and inside
 * their dates. 'A' coupons are shared privately and never listed.
 */
export async function getAvailableCoupons(now = new Date()): Promise<Coupon[]> {
  const db = requireDb();
  const q = query(
    collection(db, COUPONS_COL),
    where('active', '==', true),
    where('flag', '==', 'S')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ couponId: d.id, ...(d.data() as Omit<Coupon, 'couponId'>) }))
    .filter((c) => isPublicCoupon(c) && couponWindow(c, now) === 'open');
}

