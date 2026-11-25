import type { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.weftoncopper.com';

interface ProductEntry {
  slug: string;
  lastModified?: Date;
}

/** Firestore Timestamp, ISO string or nothing → Date (or undefined when unknown). */
function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

async function getProducts(): Promise<ProductEntry[]> {
  try {
    const db = getFirebaseDb();
    if (!db) return [];
    const snap = await getDocs(collection(db, 'products'));
    return snap.docs
      .map((doc) => {
        const data = doc.data();
        return { slug: data.slug as string, lastModified: toDate(data.updatedAt) ?? toDate(data.createdAt) };
      })
      .filter((p) => Boolean(p.slug));
  } catch {
    return [];
  }
}

// Public pages worth finding in search. Account, checkout, admin and the
// per-serial welcome pages are left out (they are noindex). No
// lastModified on these: a made-up "now" date teaches search engines to
// ignore it (MRD-01).
const STATIC_PAGES: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/men', changeFrequency: 'daily', priority: 0.9 },
  { path: '/women', changeFrequency: 'daily', priority: 0.9 },
  { path: '/new-arrivals', changeFrequency: 'daily', priority: 0.8 },
  { path: '/bestsellers', changeFrequency: 'daily', priority: 0.8 },
  { path: '/vision', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/check-product', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/size-guide', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/wash-care', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/shipping', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/returns', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/refund-policy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${siteUrl}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    ...(p.lastModified ? { lastModified: p.lastModified } : {}),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}
