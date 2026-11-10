// ============================================================
// Wefton Copper — Category Service (Firestore)
// ============================================================
// Provides dynamic category data so the navigation menu, homepage
// showcase, and product dashboard stay in sync with the actual
// products that exist in Firestore.
//
// Source of truth: the `products` collection. Distinct `category`
// values (per gender) are derived directly from live products, so
// adding a product under a new category automatically surfaces that
// category in the menu and showcase — no separate seeding required.
//
// The `categories` collection (seeded via /seed) is used as an
// optional metadata source for ordering and thumbnails. When it is
// empty or unreachable, we fall back to product-derived categories,
// and finally to the static config in `@/config/brand`.
// ============================================================
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { Category, Product } from '@/types';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';
import { primaryImage } from '@/lib/productImages';

const CATEGORIES_COL = 'categories';
const PRODUCTS_COL = 'products';

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
}

/** Build a slug → thumbnail map from the static config for image reuse. */
function thumbnailFor(gender: 'men' | 'women', slug: string): string {
  const source = gender === 'men' ? MEN_CATEGORIES : WOMEN_CATEGORIES;
  const match = source.find((c) => c.slug === slug);
  return match?.thumbnail ?? (gender === 'men' ? '/men_product_01.png' : '/women_product_01.png');
}

/** Turn a raw category value into a URL-friendly slug. */
function slugify(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Turn a slug or raw category value into a display name (Title Case). */
function displayName(value: string): string {
  return value
    .toString()
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}


/**
 * Derive distinct categories for a gender directly from the products
 * that exist in Firestore. Each category uses its first product's
 * primary image as the thumbnail. This is the primary "keep in sync"
 * mechanism: any product added under a category makes it appear here.
 */
export async function getCategoriesFromProducts(
  gender: 'men' | 'women'
): Promise<NavCategory[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const q = query(collection(db, PRODUCTS_COL), where('gender', '==', gender));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    // Preserve first-seen order; dedupe by slug.
    const bySlug = new Map<string, NavCategory>();
    snap.docs.forEach((d) => {
      const product = { productId: d.id, ...(d.data() as Omit<Product, 'productId'>) };
      const raw = (product.category ?? '').toString().trim();
      if (!raw) return;
      const slug = slugify(raw);
      if (!slug || bySlug.has(slug)) return;
      bySlug.set(slug, {
        id: `${gender}-${slug}`,
        name: displayName(raw),
        slug,
        thumbnail: primaryImage(product)?.url || thumbnailFor(gender, slug),
      });
    });

    return Array.from(bySlug.values());
  } catch {
    return [];
  }
}

/**
 * Categories for a gender that have at least one product. The managed
 * `categories` collection only sets their order, names and thumbnails; a
 * category with no products is never shown (menu, home page or filters).
 */
export async function getCategoriesByGender(
  gender: 'men' | 'women'
): Promise<NavCategory[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  // Derive from products first — this is the live source of truth.
  const fromProducts = await getCategoriesFromProducts(gender);
  if (!fromProducts.length) return [];

  // Try the managed `categories` collection for ordering/thumbnails.
  let managed: NavCategory[] = [];
  try {
    const q = query(
      collection(db, CATEGORIES_COL),
      where('gender', '==', gender),
      orderBy('order', 'asc')
    );
    const snap = await getDocs(q);
    managed = snap.docs.map((d) => {
      const data = d.data() as Category;
      return {
        id: data.categoryId || d.id,
        name: data.name,
        slug: data.slug,
        thumbnail: data.image || '',
      };
    });
  } catch {
    // Missing composite index or offline → ignore managed list.
    managed = [];
  }

  // Managed order first (only the ones with products), then any other
  // category a product uses.
  const bySlug = new Map(fromProducts.map((c) => [c.slug, c]));
  const ordered = managed
    .filter((c) => bySlug.has(c.slug))
    .map((c) => ({ ...c, thumbnail: c.thumbnail || bySlug.get(c.slug)!.thumbnail }));
  const seen = new Set(ordered.map((c) => c.slug));
  return [...ordered, ...fromProducts.filter((c) => !seen.has(c.slug))];
}

/** Convenience: fetch both genders in parallel. */
export async function getNavCategories(): Promise<{
  men: NavCategory[];
  women: NavCategory[];
}> {
  const [men, women] = await Promise.all([
    getCategoriesByGender('men'),
    getCategoriesByGender('women'),
  ]);
  return { men, women };
}
