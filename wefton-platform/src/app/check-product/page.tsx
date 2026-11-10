import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckProductClient from '@/components/check-product/CheckProductClient';

export const metadata: Metadata = {
  title: 'Check Your Product',
  description: 'Enter the serial on your Wefton Copper tag to check that your product is genuine and see its details.',
};

export default function CheckProductPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Check Your Product</h1>
        <p className="text-[var(--text-muted)] mb-10">
          Every Wefton Copper garment carries a serial under the barcode on its tag. Enter it below to check that your
          product is genuine and see its details.
        </p>
        <Suspense>
          <CheckProductClient />
        </Suspense>
      </div>
    </div>
  );
}
