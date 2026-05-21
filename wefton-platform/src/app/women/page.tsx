import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

// Ensure static generation at build time (SSG shell + client-side data)
export const dynamic = 'force-static';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: "Women's Collection",
  description:
    "Shop Wefton Copper Women's Collection — Kurtis, Crop Tops, Active Wear, Palazzo Pants, and more. Elevated silhouettes for the modern woman.",
  openGraph: {
    title: "Women's Collection | Wefton Copper",
    description:
      "Shop Wefton Copper Women's Collection — Elevated silhouettes crafted from premium Micro-French Terry.",
    url: `${siteUrl}/women`,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: "Wefton Copper Women's Collection" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Women's Collection | Wefton Copper",
    description: "Shop Wefton Copper Women's Collection — Premium Micro-French Terry essentials.",
    images: ['/og-image.jpg'],
  },
};

export default function WomenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-height)] p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <CollectionPage gender="women" title="Women's Collection" subtitle="Elevated silhouettes for the modern woman." />
    </Suspense>
  );
}
