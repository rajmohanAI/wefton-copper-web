// ============================================================
// Wefton Copper — Product Service (Firestore)
// ============================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { Product, FilterState } from '@/types';

const PRODUCTS_COL = 'products';
const PAGE_SIZE = 12;

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

// ── Read ──────────────────────────────────────────────────────

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = requireDb();
  const q = query(collection(db, PRODUCTS_COL), where('slug', '==', slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { productId: d.id, ...(d.data() as Omit<Product, 'productId'>) };
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, PRODUCTS_COL, id));
  if (!snap.exists()) return null;
  return { productId: snap.id, ...(snap.data() as Omit<Product, 'productId'>) };
}

export async function getFeaturedProducts(count = 8): Promise<Product[]> {
  const db = requireDb();
  const q = query(
    collection(db, PRODUCTS_COL),
    where('featured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ productId: d.id, ...(d.data() as Omit<Product, 'productId'>) }));
}

export async function getBestsellerProducts(count = 8): Promise<Product[]> {
  const db = requireDb();
  const q = query(
    collection(db, PRODUCTS_COL),
    where('bestseller', '==', true),
    orderBy('ratings', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ productId: d.id, ...(d.data() as Omit<Product, 'productId'>) }));
}

export async function getNewArrivals(count = 8): Promise<Product[]> {
  const db = requireDb();
  const q = query(
    collection(db, PRODUCTS_COL),
    where('newArrival', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ productId: d.id, ...(d.data() as Omit<Product, 'productId'>) }));
}

export async function getProductsByGender(
  gender: 'men' | 'women',
  filters: Partial<FilterState> = {},
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ products: Product[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const db = requireDb();
  const constraints: QueryConstraint[] = [where('gender', '==', gender)];

  if (filters.category?.length) {
    constraints.push(where('category', 'in', filters.category));
  }
  if (filters.availability) {
    constraints.push(where('inventory', '>', 0));
  }
  if (filters.newArrivals) {
    constraints.push(where('newArrival', '==', true));
  }
  if (filters.bestsellers) {
    constraints.push(where('bestseller', '==', true));
  }

  const sortField =
    filters.sortBy === 'price-asc' || filters.sortBy === 'price-desc'
      ? 'price'
      : filters.sortBy === 'rating'
      ? 'ratings'
      : 'createdAt';
  const sortDir = filters.sortBy === 'price-asc' ? ('asc' as const) : ('desc' as const);

  constraints.push(orderBy(sortField, sortDir));

  // Fetch extra docs to account for client-side filtering (price range, rating)
  const fetchLimit = PAGE_SIZE * 3;
  constraints.push(limit(fetchLimit));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, PRODUCTS_COL), ...constraints);
  const snap = await getDocs(q);

  let products = snap.docs.map((d) => ({
    productId: d.id,
    ...(d.data() as Omit<Product, 'productId'>),
  }));

  // Client-side filter: price range
  // Firestore doesn't support inequality filters on multiple fields in a compound query
  if (filters.priceRange) {
    const [minPrice, maxPrice] = filters.priceRange;
    if (minPrice > 0 || (maxPrice < Infinity && maxPrice > 0)) {
      products = products.filter(
        (p) => p.price >= minPrice && p.price <= maxPrice
      );
    }
  }

  // Client-side filter: minimum rating
  if (filters.rating && filters.rating > 0) {
    products = products.filter((p) => p.ratings >= filters.rating!);
  }

  // Trim to page size after client-side filtering
  products = products.slice(0, PAGE_SIZE);

  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { products, lastDoc };
}

export async function getSimilarProducts(
  category: string,
  excludeId: string,
  count = 4
): Promise<Product[]> {
  const db = requireDb();
  const q = query(
    collection(db, PRODUCTS_COL),
    where('category', '==', category),
    limit(count + 1)
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== excludeId)
    .slice(0, count)
    .map((d) => ({ productId: d.id, ...(d.data() as Omit<Product, 'productId'>) }));
}

export async function searchProducts(searchQuery: string): Promise<Product[]> {
  const db = requireDb();
  const snap = await getDocs(collection(db, PRODUCTS_COL));
  const lower = searchQuery.toLowerCase();
  return snap.docs
    .map((d) => ({ productId: d.id, ...(d.data() as Omit<Product, 'productId'>) }))
    .filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        p.tags?.some((t) => t.toLowerCase().includes(lower))
    )
    .slice(0, 20);
}

// ── Admin Write ───────────────────────────────────────────────

export async function createProduct(data: Omit<Product, 'productId' | 'createdAt'>): Promise<string> {
  const db = requireDb();
  const ref = await addDoc(collection(db, PRODUCTS_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, PRODUCTS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, PRODUCTS_COL, id));
}
