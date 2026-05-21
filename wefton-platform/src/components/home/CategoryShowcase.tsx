'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

/**
 * Category tile data — sourced from a static array with Firebase Storage image URLs.
 * In production, these URLs would come from Firestore category documents.
 * Each tile links to the appropriate gender collection with a category filter query param.
 */
interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  gender: 'men' | 'women';
  image: string;
}

const CATEGORY_TILES: CategoryTile[] = [
  {
    id: 'men-premium-tee',
    name: 'Premium Tee',
    slug: 'premium-tee',
    gender: 'men',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fmen-premium-tee.webp?alt=media',
  },
  {
    id: 'men-oversized-tee',
    name: 'Oversized Tee',
    slug: 'oversized-tee',
    gender: 'men',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fmen-oversized-tee.webp?alt=media',
  },
  {
    id: 'men-hoodies',
    name: 'Hoodies',
    slug: 'hoodies',
    gender: 'men',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fmen-hoodies.webp?alt=media',
  },
  {
    id: 'women-kurtis',
    name: 'Kurtis',
    slug: 'kurtis',
    gender: 'women',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fwomen-kurtis.webp?alt=media',
  },
  {
    id: 'women-crop-top',
    name: 'Crop Top',
    slug: 'crop-top',
    gender: 'women',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fwomen-crop-top.webp?alt=media',
  },
  {
    id: 'men-joggers',
    name: 'Joggers',
    slug: 'joggers',
    gender: 'men',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fmen-joggers.webp?alt=media',
  },
  {
    id: 'women-active-wear',
    name: 'Active Wear',
    slug: 'active-wear',
    gender: 'women',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fwomen-active-wear.webp?alt=media',
  },
  {
    id: 'men-premium-polo',
    name: 'Premium Polo',
    slug: 'premium-polo',
    gender: 'men',
    image: 'https://firebasestorage.googleapis.com/v0/b/wefton-copper.appspot.com/o/categories%2Fmen-premium-polo.webp?alt=media',
  },
];

/**
 * Branded placeholder shown when a category image fails to load.
 * Displays the Wefton Copper brand mark with the category name.
 */
function BrandedPlaceholder({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-darker)] border border-[var(--border-subtle)]">
      <div className="w-12 h-12 rounded-full bg-[var(--copper-main)]/20 flex items-center justify-center mb-3">
        <span className="text-lg font-semibold text-[var(--copper-light)]">W</span>
      </div>
      <span className="text-sm text-[var(--text-muted)] text-center px-4">{name}</span>
    </div>
  );
}

/**
 * Individual category tile with image, name, and link.
 * Shows branded placeholder on image load failure.
 */
function CategoryTileCard({ tile, index }: { tile: CategoryTile; index: number }) {
  const [imageError, setImageError] = useState(false);
  const href = `/${tile.gender}?category=${tile.slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-xl aspect-[3/4] bg-[var(--bg-darker)]"
      >
        {/* Category Image or Branded Placeholder */}
        {imageError ? (
          <BrandedPlaceholder name={tile.name} />
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
    </motion.div>
  );
}

/**
 * CategoryShowcase — displays 6+ category tiles on the homepage.
 * Each tile links to the filtered collection page (/men?category=slug or /women?category=slug).
 * Responsive grid: 2 cols mobile, 3 cols tablet, 4 cols desktop.
 * Uses Framer Motion for viewport entrance animations.
 */
export default function CategoryShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-20 px-6 max-w-[1400px] mx-auto">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <p className="text-xs tracking-[4px] uppercase text-[var(--copper-light)] mb-3">
          Shop by Category
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)]">
          Explore Our Collections
        </h2>
        <p className="mt-3 text-sm text-[var(--text-muted)] max-w-md mx-auto">
          Discover premium essentials crafted from Micro-French Terry for every occasion
        </p>
      </motion.div>

      {/* Category Grid — 2 cols mobile, 3 cols tablet, 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {CATEGORY_TILES.map((tile, index) => (
          <CategoryTileCard key={tile.id} tile={tile} index={index} />
        ))}
      </div>
    </section>
  );
}
