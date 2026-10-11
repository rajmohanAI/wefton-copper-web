'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';
import Container from '@/components/layout/Container';
import ProductGrid from '@/components/catalog/ProductGrid';

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  viewAllHref?: string;
}

/**
 * FeaturedProducts — renders a grid of ProductCard components with immediate visibility
 * (no entrance animations). Accepts a `products` prop for reuse across pages
 * (e.g., homepage "Featured Collection" or product detail "You May Also Like").
 *
 * Shows a "Coming Soon" placeholder when no products are available.
 * "Add to Cart" on each ProductCard adds the default variant and opens the CartDrawer.
 */
export default function FeaturedProducts({
  title = 'Featured Collection',
  subtitle,
  products,
  loading = false,
  viewAllHref,
}: FeaturedProductsProps) {
  return (
    <Container>
      {/* Header */}
      <div
        className="text-center mb-12"
        style={{ opacity: 1, transform: 'none' }}
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-[var(--copper-light)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-sm text-[var(--text-muted)] max-w-md mx-auto">
              {subtitle}
            </p>
          )}
        </div>
        {viewAllHref && products.length > 0 && (
          <Link
            href={viewAllHref}
            className="hidden md:inline-flex items-center gap-2 text-xs tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors group mt-4"
          >
            View All
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <ProductGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </ProductGrid>
      )}

      {/* "Coming Soon" placeholder when no featured products exist */}
      {!loading && products.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-darker)]/50"
          style={{ opacity: 1, transform: 'none' }}
        >
          <div className="w-14 h-14 rounded-full bg-[var(--copper-main)]/10 flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-[var(--copper-light)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-light)] mb-2">
            Coming Soon
          </h3>
          <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">
            Our curated featured collection is being prepared. Check back soon for handpicked essentials.
          </p>
        </div>
      )}

      {/* Product Grid — immediate visibility, no animations */}
      {!loading && products.length > 0 && (
        <ProductGrid>
          {products.map((product, i) => (
            <ProductCard key={product.productId} product={product} priority={i < 4} />
          ))}
        </ProductGrid>
      )}

      {/* Mobile View All */}
      {viewAllHref && products.length > 0 && (
        <div className="mt-8 text-center md:hidden">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-[var(--copper-light)] border border-[var(--copper-main)] px-6 py-3 rounded hover:bg-[var(--copper-main)] hover:text-white transition-colors"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </Container>
  );
}
