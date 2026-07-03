'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProductBySlug, getSimilarProducts } from '@/services/productService';
import ProductDetailClient from './ProductDetailClient';
import type { Product } from '@/types';

/**
 * Client-side fallback for product detail page.
 * Used when server-side rendering can't fetch from Firestore
 * (e.g., during static build or when env vars aren't available server-side).
 */
export default function ProductDetailFallback({ slug }: { slug: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const p = await getProductBySlug(slug);
        if (!p) {
          setError(true);
          return;
        }
        setProduct(p);
        const sim = await getSimilarProducts(p.category, p.productId, 4);
        setSimilar(sim);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-8xl font-light text-[var(--copper-main)] mb-4">404</p>
          <h1 className="text-2xl font-light text-[var(--text-light)] mb-3">Product not found</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[var(--copper-main)] text-white text-sm font-medium tracking-wider uppercase rounded hover:bg-[var(--copper-dark)] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <ProductDetailClient product={product} similar={similar} />;
}
