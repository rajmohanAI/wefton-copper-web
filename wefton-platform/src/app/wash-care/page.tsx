import type { Metadata } from 'next';
import { Suspense } from 'react';
import { STANDARD_COTTON_TEE_GUIDE } from '@/config/washCare';
import WashCareGuideView from '@/components/care/WashCareGuideView';
import WashCareClient from '@/components/guides/WashCareClient';

export const metadata: Metadata = {
  title: 'Wash Care Instructions',
  description:
    'How to wash, dry, iron and store your Wefton Copper cotton garments so they keep their shape, colour and softness.',
};

export default function WashCarePage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">
          Wash Care Instructions
        </h1>
        <p className="text-[var(--text-muted)] mb-12">
          Simple care keeps your Wefton Copper garment looking and feeling its best. Choose your
          product below, and always check the care label inside the garment as well.
        </p>
        <Suspense fallback={<WashCareGuideView guide={STANDARD_COTTON_TEE_GUIDE} />}>
          <WashCareClient />
        </Suspense>
      </div>
    </div>
  );
}
