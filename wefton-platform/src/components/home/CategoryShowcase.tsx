'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCategoriesByGender } from '@/services/categoryService';
import Container from '@/components/layout/Container';

/**
 * CategoryShowcase — displays product category tiles on the homepage.
 * Tiles come from Firestore categories (same source as the menu). Until
 * they arrive, skeleton tiles hold the space; a tile with no image yet
 * shows a plain placeholder rather than a fallback photo (V2 spec, Req 7.9).
 * Each tile links to the filtered collection page.
 */

interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  gender: 'men' | 'women';
  image: string;
}

// Static fallback tiles — used when Firestore categories are unavailable.
// No images: these only keep the section usable.
const CATEGORY_TILES: CategoryTile[] = [
  { id: 'men-premium-tee', name: 'Premium Tee', slug: 'premium-tee', gender: 'men', image: '' },
  { id: 'men-oversized-tee', name: 'Oversized Tee', slug: 'oversized-tee', gender: 'men', image: '' },
  { id: 'men-premium-polo', name: 'Premium Polo', slug: 'premium-polo', gender: 'men', image: '' },
  { id: 'men-full-sleeved-tee', name: 'Full Sleeved Tee', slug: 'full-sleeved-tee', gender: 'men', image: '' },
  { id: 'men-active-wear', name: 'Active Wear', slug: 'active-wear', gender: 'men', image: '' },
  { id: 'women-premium-tee', name: 'Premium Tee', slug: 'premium-tee', gender: 'women', image: '' },
  { id: 'women-active-wear', name: 'Active Wear', slug: 'active-wear', gender: 'women', image: '' },
];

const SKELETON_COUNT = 8;

function CategoryTileCard({ tile }: { tile: CategoryTile }) {
  const [imageError, setImageError] = useState(false);
  const href = `/${tile.gender}?category=${tile.slug}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl aspect-[3/4] bg-[var(--bg-darker)]"
    >
      {/* Category Image */}
      {imageError || !tile.image ? (
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
  const [tiles, setTiles] = useState<CategoryTile[] | null>(null);

  // Hydrate tiles from Firestore categories so the homepage showcase
  // reflects the same categories as the menu. Falls back to static.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCategoriesByGender('men'),
      getCategoriesByGender('women'),
    ])
      .then(([men, women]) => {
        if (cancelled) return;
        const next: CategoryTile[] = [
          ...men.map((c) => ({
            id: `men-${c.slug}`,
            name: c.name,
            slug: c.slug,
            gender: 'men' as const,
            image: c.thumbnail,
          })),
          ...women.map((c) => ({
            id: `women-${c.slug}`,
            name: c.name,
            slug: c.slug,
            gender: 'women' as const,
            image: c.thumbnail,
          })),
        ];
        setTiles(next.length ? next : CATEGORY_TILES);
      })
      .catch(() => {
        if (!cancelled) setTiles(CATEGORY_TILES);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container>
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
        {tiles
          ? tiles.map((tile) => <CategoryTileCard key={tile.id} tile={tile} />)
          : Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="skeleton rounded-xl aspect-[3/4] bg-[var(--bg-darker)]"
              />
            ))}
      </div>
    </Container>
  );
}
