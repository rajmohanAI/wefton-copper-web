// ============================================================
// Wefton Copper — Review Service (Firestore)
// ============================================================
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { Review } from '@/types';

const REVIEWS_COL = 'reviews';
const PRODUCTS_COL = 'products';

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

/**
 * Fetches all reviews for a given product, ordered by createdAt descending.
 * Validates: Requirement 15.1
 */
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

/**
 * Adds a new review and atomically updates the product's `ratings` (average)
 * and `reviewsCount` fields using a Firestore transaction.
 * Validates: Requirements 15.3, 15.4
 */
export async function addReview(
  review: Omit<Review, 'reviewId' | 'createdAt' | 'helpful'>
): Promise<string> {
  const db = requireDb();
  const productRef = doc(db, PRODUCTS_COL, review.productId);

  const reviewId = await runTransaction(db, async (transaction) => {
    // Read the current product document to get existing ratings and reviewsCount
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error(`Product ${review.productId} not found`);
    }

    const productData = productSnap.data();
    const currentRatings = productData.ratings ?? 0;
    const currentReviewsCount = productData.reviewsCount ?? 0;

    // Calculate new average rating
    const newReviewsCount = currentReviewsCount + 1;
    const totalRatingSum = currentRatings * currentReviewsCount + review.rating;
    const newAverageRating = Math.round((totalRatingSum / newReviewsCount) * 10) / 10;

    // Add the review document
    const reviewRef = doc(collection(db, REVIEWS_COL));
    transaction.set(reviewRef, {
      ...review,
      helpful: 0,
      createdAt: serverTimestamp(),
    });

    // Atomically update the product's ratings and reviewsCount
    transaction.update(productRef, {
      ratings: newAverageRating,
      reviewsCount: newReviewsCount,
    });

    return reviewRef.id;
  });

  return reviewId;
}

/**
 * Atomically increments the `helpful` counter on a review.
 * Validates: Requirement 15.7
 */
export async function markHelpful(reviewId: string): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, REVIEWS_COL, reviewId), { helpful: increment(1) });
}
