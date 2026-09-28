'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';

interface SimilarProductsProps {
  products: Product[];
}

/**
 * Renders a horizontal scrollable row of similar ProductCard components.
 * Hidden entirely if fewer than 2 products are provided.
 * Renders immediately without entrance animations.
 *
 * Validates: Requirements 14.1–14.3
 */
export default function SimilarProducts({ products }: SimilarProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide section if fewer than 2 similar products
  if (products.length < 2) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="mt-20" aria-labelledby="similar-products-heading">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-8"
        style={{ opacity: 1, transform: 'none' }}
      >
        <h2
          id="similar-products-heading"
          className="text-2xl md:text-3xl font-light tracking-tight text-[var(--copper-light)]"
        >
          You May Also Like
        </h2>

        {/* Scroll navigation arrows (visible on desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--copper-main)] hover:text-[var(--copper-light)] transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--copper-main)] hover:text-[var(--copper-light)] transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal scrollable row */}
      <div style={{ opacity: 1, transform: 'none' }}>
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory"
        >
          {products.map((product, i) => (
            <div
              key={product.productId}
              className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-[300px] snap-start"
            >
              <ProductCard product={product} priority={i < 2} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
