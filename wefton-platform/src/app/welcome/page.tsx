import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BRAND, MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Welcome to Wefton Copper',
  description: 'Premium Cotton Fabric essentials for men and women. Discover our collection.',
};

const PRODUCTS = [
  ...MEN_CATEGORIES.slice(0, 5).map((c) => ({ ...c, gender: 'men' as const })),
  ...WOMEN_CATEGORIES.map((c) => ({ ...c, gender: 'women' as const })),
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#f8f6f3] text-[#1a1a1a] pt-[var(--nav-height)]">
      {/* Product Grid */}
      <section className="px-4 py-10">
        <p className="text-xs tracking-[4px] uppercase text-[#B87333] text-center mb-6">
          Our Collection
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {PRODUCTS.map((product) => (
            <Link
              key={`${product.gender}-${product.id}`}
              href={`/${product.gender}?category=${product.slug}`}
              className="group relative block overflow-hidden rounded-lg aspect-[3/4] bg-[#ece8e3]"
            >
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 25vw"
                quality={70}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs font-medium text-white">{product.name}</p>
                <p className="text-[0.625rem] text-white/60 uppercase">
                  {product.gender === 'men' ? "Men's" : "Women's"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brand Differentiators */}
      <section className="px-6 py-10 border-t border-neutral-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
          <div>
            <p className="text-lg font-light text-[#B87333]">✓</p>
            <p className="text-xs text-neutral-600 mt-1">Authenticity Serial Number</p>
          </div>
          <div>
            <p className="text-lg font-light text-[#B87333]">✓</p>
            <p className="text-xs text-neutral-600 mt-1">Premium Packaging</p>
          </div>
          <div>
            <p className="text-lg font-light text-[#B87333]">✓</p>
            <p className="text-xs text-neutral-600 mt-1">Plantable Seed Tag</p>
          </div>
          <div>
            <p className="text-lg font-light text-[#B87333]">✓</p>
            <p className="text-xs text-neutral-600 mt-1">Fabric Freshener</p>
          </div>
          <div>
            <p className="text-lg font-light text-[#B87333]">✓</p>
            <p className="text-xs text-neutral-600 mt-1">Collapsible Hanger</p>
          </div>
          <div>
            <p className="text-lg font-light text-[#B87333]">✓</p>
            <p className="text-xs text-neutral-600 mt-1">Copper Stitching</p>
          </div>
        </div>
      </section>

      {/* Social Handles + Contact */}
      <section className="px-6 py-10 border-t border-neutral-200 text-center">
        <p className="text-xs tracking-[4px] uppercase text-[#B87333] mb-4">
          Connect With Us
        </p>
        <div className="flex items-center justify-center gap-6 mb-6">
          <a
            href={BRAND.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-[#B87333] transition-colors text-sm"
          >
            Instagram
          </a>
          <a
            href={BRAND.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-[#B87333] transition-colors text-sm"
          >
            Facebook
          </a>
          <a
            href={BRAND.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-[#B87333] transition-colors text-sm"
          >
            Twitter
          </a>
        </div>
        <div className="space-y-1 text-xs text-neutral-500">
          <p>{BRAND.email}</p>
          <p>{BRAND.phone}</p>
          <p>{BRAND.address}</p>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-8 border-t border-neutral-200 text-center">
        <Link
          href="/"
          className="inline-block px-10 py-3 border border-[#B87333] text-[#B87333] text-sm font-medium tracking-wider uppercase rounded hover:bg-[#B87333] hover:text-white transition-colors"
        >
          Visit Full Store
        </Link>
        <p className="mt-4 text-[0.625rem] text-neutral-400">
          © 2026 Wefton Copper. All rights reserved.
        </p>
      </section>
    </div>
  );
}
