'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * CategoryShowcase — displays product category tiles on the homepage.
 * Uses local product images from /public folder (referenced in brand.ts).
 * Each tile links to the filtered collection page.
 */

interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  gender: 'men' | 'women';
  image: string;
}

// Build tiles from brand config — only categories with actual seeded products
const CATEGORY_TILES: CategoryTile[] = [
  // Men's (5 products that exist in Firestore)
  { id: 'men-premium-tee', name: 'Premium Tee', slug: 'premium-tee', gender: 'men', image: '/men_product_01.png' },
  { id: 'men-oversized-tee', name: 'Oversized Tee', slug: 'oversized-tee', gender: 'men', image: '/men_product_03.png' },
  { id: 'men-premium-polo', name: 'Premium Polo', slug: 'premium-polo', gender: 'men', image: '/men_product_05.png' },
  { id: 'men-active-wear', name: 'Active Wear', slug: 'active-wear', gender: 'men', image: '/men_product_07.png' },
  { id: 'men-hoodies', name: 'Hoodies', slug: 'hoodies', gender: 'men', image: '/men_product_09.png' },
  // Women's (1 product that exists in Firestore)
  { id: 'women-premium-tee', name: 'Premium Tee', slug: 'premium-tee', gender: 'women', image: '/women_product_01.png' },
  { id: 'women-co-ords', name: 'Co-Ords', slug: 'co-ords', gender: 'women', image: '/women_product_02.png' },
];

function CategoryTileCard({ tile }: { tile: CategoryTile }) {
  const [imageError, setImageError] = useState(false);
  const href = `/${tile.gender}?category=${tile.slug}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl aspect-[3/4] bg-[var(--bg-darker)]"
    >
      {/* Category Image */}
      {imageError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-darker)] border border-[var(--border-subtle)]">
          <div className="w-12 h-12 rounded-full bg-[var(--copper-main)]/20 flex items-center justify-center mb-3">
            <span className="text-lg font-semibold text-[var(--copper-light)]">W</span>
          </div>
          <span className="text-sm text-[var(--text-muted)] text-center px-4">{tile.name}</span>
        </div>
      ) : (
        <Image
          src={tile.image}
          alt={`${tile.name} — ${tile.gender === 'men' ? "Men's" : "Women's"} Collection`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
          onError={() => setImageError(true)}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <h3 className="text-base md:text-lg font-medium text-white mb-1">
          {tile.name}
        </h3>
        <p className="text-xs text-white/60 uppercase tracking-wider">
          {tile.gender === 'men' ? "Men's" : "Women's"}
        </p>
      </div>

      {/* Hover border */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--copper-main)]/50 rounded-xl transition-colors duration-300" />
    </Link>
  );
}

export default function CategoryShowcase() {
  return (
    <section className="py-20 px-4 md:px-8 lg:px-8 max-w-[1280px] mx-auto">
      {/* Section Header */}
      <div className="text-center mb-12">
        <p className="text-xs tracking-[4px] uppercase text-[var(--copper-light)] mb-3">
          Shop by Category
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)]">
          Explore Our Collections
        </h2>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {CATEGORY_TILES.map((tile) => (
          <CategoryTileCard key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
