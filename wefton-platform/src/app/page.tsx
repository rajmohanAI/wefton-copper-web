import type { Metadata } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import BannerSlider from '@/components/home/BannerSlider';
import type { BannerSlide } from '@/components/home/BannerSlider';
import CategoryShowcase from '@/components/home/CategoryShowcase';
import BrandStory from '@/components/home/BrandStory';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import FeaturedProductsServer from '@/components/home/FeaturedProductsServer';
import NewsletterForm from '@/components/layout/NewsletterForm';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'Wefton Copper | Premium Micro-French Terry',
  description:
    'Wefton Copper — Premium Micro-French Terry essentials for men and women. Redefining the global standard for essential wear, starting from the thread up.',
  openGraph: {
    title: 'Wefton Copper | Premium Micro-French Terry',
    description:
      'Premium Micro-French Terry essentials. Crafted for the discerning individual.',
    url: siteUrl,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Wefton Copper' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wefton Copper | Premium Micro-French Terry',
    description: 'Premium Micro-French Terry essentials.',
    images: ['/og-image.jpg'],
  },
};

/**
 * Placeholder banner slides for the homepage hero.
 * Each slide uses a placeholder image path with descriptive alt text
 * indicating the intended content and dimensions.
 */
const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'slide-1',
    headline: '',
    subheading: '',
    ctaText: '',
    ctaHref: '/men',
    imageUrl: '/banners/hero-men-collection.jpg',
    imageAlt: "Men's Collection Banner — 1920x600",
  },
  {
    id: 'slide-2',
    headline: '',
    subheading: '',
    ctaText: '',
    ctaHref: '/women',
    imageUrl: '/banners/hero-women-collection.jpg',
    imageAlt: "Women's Collection Banner — 1920x600",
  },
  {
    id: 'slide-3',
    headline: 'New Season Drop',
    subheading: 'Oversized tees, premium polos, and co-ords — just landed',
    ctaText: 'Explore New Arrivals',
    ctaHref: '/men?category=new-arrivals',
    imageUrl: '/banners/hero-new-arrivals.jpg',
    imageAlt: 'New Arrivals Banner — 1920x600',
  },
];

export default function HomePage() {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Wefton Copper',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      'Premium Micro-French Terry essentials. Redefining the global standard for essential wear, starting from the thread up.',
    sameAs: [
      'https://www.instagram.com/weftoncopper',
      'https://www.facebook.com/weftoncopper',
      'https://twitter.com/weftoncopper',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'weftoncopper@gmail.com',
      contactType: 'customer service',
    },
  };

  return (
    <>
      <Script
        id="organization-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Homepage sections — Fuaark-inspired layout with bold typography and generous spacing */}
      <div className="space-y-16 md:space-y-24">

        {/* 1. Banner Slider — full-width hero with promotional slides */}
        <section aria-label="Hero banner">
          <BannerSlider slides={BANNER_SLIDES} />
        </section>

        {/* 2. Category Showcase — shop by category grid */}
        <section aria-label="Shop by category" className="py-16 md:py-24">
          <CategoryShowcase />
        </section>

        {/* 3. Featured Products — server-side fetched with skeleton fallback */}
        <section aria-label="Featured products" className="py-16 md:py-24">
          <Suspense
            fallback={
              <div className="px-4 md:px-8 max-w-[1280px] mx-auto">
                <div className="text-center mb-12">
                  <SkeletonLoader variant="text-block" className="max-w-xs mx-auto" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonLoader key={i} variant="product-card" />
                  ))}
                </div>
              </div>
            }
          >
            <FeaturedProductsServer />
          </Suspense>
        </section>

        {/* 4. Brand Story — differentiators and craftsmanship */}
        <section aria-label="Brand story" className="py-16 md:py-24">
          <BrandStory />
        </section>

        {/* 5. Testimonials — customer reviews carousel */}
        <section aria-label="Customer testimonials" className="py-16 md:py-24">
          <TestimonialsSection />
        </section>

        {/* 6. Newsletter — email signup section */}
        <section
          aria-label="Newsletter signup"
          className="py-16 md:py-24 bg-[var(--color-card,#f9f9f9)] dark:bg-[var(--color-card,#171717)]"
        >
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 text-center">
            {/* Placeholder image area */}
            <div className="w-full max-w-2xl mx-auto mb-10 aspect-[16/5] rounded-lg bg-[var(--color-border,#e5e5e5)] dark:bg-[var(--color-border,#262626)] flex items-center justify-center">
              <p className="text-sm text-[var(--color-muted,#737373)]">
                Newsletter Banner — 1280x400
              </p>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-[var(--color-foreground,#0a0a0a)] dark:text-[var(--color-foreground,#fafafa)] mb-4">
              Join the Copper Community
            </h2>
            <p className="text-base md:text-lg text-[var(--color-muted,#737373)] dark:text-[var(--color-muted,#a3a3a3)] mb-8 max-w-xl mx-auto">
              Get early access to new drops, exclusive offers, and stories from the studio.
            </p>
            <div className="flex justify-center">
              <NewsletterForm />
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
