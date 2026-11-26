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
import Container from '@/components/layout/Container';
import Section from '@/components/layout/Section';
import ProductGrid from '@/components/catalog/ProductGrid';
import { withCanonical } from '@/lib/seo';
import { FEATURES } from '@/config/features';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.weftoncopper.com';

export const metadata: Metadata = withCanonical('/', {
  title: 'Wefton Copper | Premium Essential Wear',
  description:
    'Wefton Copper — Premium essentials for men and women. Redefining the standard for essential wear, starting from the fabric.',
  openGraph: {
    title: 'Wefton Copper | Premium Essential Wear',
    description:
      'High quality essentials. Crafted for the discerning individual.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Wefton Copper' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wefton Copper | Premium Essential Wear',
    description: 'Premium essentials.',
    images: ['/og-image.jpg'],
  },
});

/**
 * Homepage hero slides. The alt text describes each photo for screen
 * readers, search engines and AI assistants (MRD-01).
 */
const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'slide-1',
    headline: '',
    subheading: '',
    ctaText: 'Shop Now',
    ctaHref: '/men',
    imageUrl: '/banners/hero-men-collection.jpg',
    imageAlt:
      "Men's collection: a man in a blue long-sleeve Wefton Copper top and white cargo trousers by a garden balustrade",
  },
  {
    id: 'slide-2',
    headline: '',
    subheading: '',
    ctaText: 'Shop Now',
    ctaHref: '/women',
    imageUrl: '/banners/hero-women-collection2.jpg',
    imageAlt: "Women's collection: a woman in a dusty-pink Wefton Copper T-shirt in a modern gym",
  },
  {
    id: 'slide-3',
    headline: '',
    subheading: '',
    ctaText: 'Shop Now',
    ctaHref: '/men',
    imageUrl: '/banners/hero-men-collection2.jpg',
    imageAlt: "Men's collection: a man in a cream Wefton Copper hoodie and dark jeans walking across an office plaza",
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
      'Premium essentials. Redefining the standard for essential wear, starting from the fabric.',
    sameAs: [
      'https://www.instagram.com/weftoncopper',
      'https://www.facebook.com/profile.php?id=61596562648320',
      'https://twitter.com/weftoncopper',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'sales@weftoncopper.com',
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

      {/* Homepage sections — order per V2 spec Req 7.5. <Section> owns vertical rhythm. */}
      <div>

        {/* 1. Banner Slider — full-width hero with promotional slides.
            The homepage header is `fixed` (see Navbar), so pad the hero by its
            un-scrolled height (48px nav + py-7) to keep the banner below it. */}
        <section aria-label="Hero banner" className="pt-[calc(48px+4.25rem)]">
          <BannerSlider slides={BANNER_SLIDES} />
        </section>

        {/* 2. Category Showcase — shop by category grid */}
        <Section aria-label="Shop by category">
          <CategoryShowcase />
        </Section>

        {/* 3. Featured Products — server-side fetched with skeleton fallback */}
        <Section aria-label="Featured products" className="empty:hidden">
          <Suspense
            fallback={
              <Container>
                <div className="text-center mb-12">
                  <SkeletonLoader variant="text-block" className="max-w-xs mx-auto" />
                </div>
                <ProductGrid>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonLoader key={i} variant="product-card" />
                  ))}
                </ProductGrid>
              </Container>
            }
          >
            <FeaturedProductsServer />
          </Suspense>
        </Section>

        {/* 4. Brand Story — differentiators and craftsmanship */}
        <section aria-label="Brand story">
          <BrandStory />
        </section>

        {/* 5. Testimonials — customer reviews carousel (off until real reviews exist) */}
        {FEATURES.testimonials && (
          <section aria-label="Customer testimonials">
            <TestimonialsSection />
          </section>
        )}

        {/* 6. "Join our family" — monthly email of our latest posts (WC-Issue-17, MRD-01) */}
        <Section aria-label="Join our family">
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-[var(--copper-light)] mb-3">Join our family</p>
              <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)] mb-4">
                Be the first to see what&apos;s new
              </h2>
              <p className="text-sm md:text-base text-[var(--text-muted)] mb-8">
                One email a month with new arrivals and stories from our Instagram and X. Nothing
                more, and you can leave anytime.
              </p>
              <div className="flex justify-center">
                <NewsletterForm id="home-newsletter" onPage />
              </div>
            </div>
          </Container>
        </Section>

      </div>
    </>
  );
}
