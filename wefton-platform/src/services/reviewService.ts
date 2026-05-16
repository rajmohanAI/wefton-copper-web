// ============================================================
// Wefton Copper — Review Service (Firestore)
// ============================================================
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { Review } from '@/types';

const REVIEWS_COL = 'reviews';

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  const db = requireDb();
  const q = query(
    collection(db, REVIEWS_COL),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ reviewId: d.id, ...(d.data() as Omit<Review, 'reviewId'>) }));
}

export async function addReview(
  review: Omit<Review, 'reviewId' | 'createdAt' | 'helpful'>
): Promise<string> {
  const db = requireDb();
  const ref = await addDoc(collection(db, REVIEWS_COL), {
    ...review,
    helpful: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markHelpful(reviewId: string): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, REVIEWS_COL, reviewId), { helpful: increment(1) });
}
