import { Suspense } from 'react';
import HeroSection from '@/components/home/HeroSection';
import CategoryShowcase from '@/components/home/CategoryShowcase';
import BrandStory from '@/components/home/BrandStory';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import FeaturedProductsServer from '@/components/home/FeaturedProductsServer';
import { Skeleton } from '@/components/ui/Skeleton';

export default function HomePage() {
  return (
    <>
      {/* Cinematic hero with scroll-driven canvas animation */}
      <HeroSection />

      {/* Category showcase */}
      <CategoryShowcase />

      {/* Featured products — server component with Suspense */}
      <Suspense
        fallback={
          <div className="py-20 px-6 max-w-[1400px] mx-auto">
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
