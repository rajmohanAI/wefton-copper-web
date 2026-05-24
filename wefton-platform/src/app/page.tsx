import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeroSection from '@/components/home/HeroSection';
import CategoryShowcase from '@/components/home/CategoryShowcase';
import BrandStory from '@/components/home/BrandStory';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import FeaturedProductsServer from '@/components/home/FeaturedProductsServer';
import { Skeleton } from '@/components/ui/Skeleton';

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
      email: 'hello@weftoncopper.com',
      contactType: 'customer service',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Cinematic hero with scroll-driven canvas animation */}
      <HeroSection />

      {/* Category showcase */}
      <CategoryShowcase />

      {/* Featured products — server component with Suspense */}
      <Suspense
        fallback={
          <div className="py-20 px-6 max-w-[1920px] mx-auto">
            <Skeleton className="h-8 w-48 mb-12" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          </div>
        }
      >
        <FeaturedProductsServer />
      </Suspense>

      {/* Brand story & pillars */}
      <BrandStory />

      {/* Testimonials */}
      <TestimonialsSection />
    </>
  );
}
