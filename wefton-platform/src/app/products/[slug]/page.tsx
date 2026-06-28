import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getSimilarProducts } from '@/services/productService';
import ProductDetailClient from '@/components/product/ProductDetailClient';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

// ISR: revalidate product detail pages every 3600 seconds (1 hour)
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-generate static paths for all products at build time.
 * Pages are revalidated via ISR every 3600s.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const db = getFirebaseDb();
    if (!db) return [];
    const snap = await getDocs(collection(db, 'products'));
    return snap.docs
      .map((doc) => ({ slug: doc.data().slug as string }))
      .filter((p) => !!p.slug);
  } catch {
    return [];
  }
}

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    if (!product) return { title: 'Product Not Found' };

    const title = product.title;
    const description = product.shortDescription || product.description || '';
    const imageUrl = product.images?.[0]?.url || '/og-image.jpg';

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Wefton Copper`,
        description,
        url: `${siteUrl}/products/${slug}`,
        images: [{ url: imageUrl, alt: product.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | Wefton Copper`,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product = null;
  let similar: Product[] = [];

  try {
    product = await getProductBySlug(slug);
    if (!product) {
      console.error(`[ProductPage] Product not found for slug: "${slug}"`);
      notFound();
    }
    similar = await getSimilarProducts(product.category, product.productId, 4);
  } catch (error) {
    console.error(`[ProductPage] Error loading product "${slug}":`, error);
    notFound();
  }

  return <ProductDetailClient product={product!} similar={similar} />;
}
