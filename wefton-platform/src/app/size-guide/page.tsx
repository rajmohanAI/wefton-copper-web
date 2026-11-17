import type { Metadata } from 'next';
import { Suspense } from 'react';
import SizeGuideClient from '@/components/guides/SizeGuideClient';
import SizeChartTable from '@/components/guides/SizeChartTable';
import { STANDARD_MEN_CHART, STANDARD_WOMEN_CHART } from '@/lib/sizeChart';

export const metadata: Metadata = {
  title: 'Size Guide',
  description:
    'Find your fit with the Wefton Copper size guide. Choose a product to see its chest or bust, shoulder and length measurements.',
};

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Size Guide</h1>
        <p className="text-sm text-[var(--text-muted)] mb-10">
          Choose a product to see its measurements. The measurements are of the garment, laid
          flat. Compare them with a T-shirt that fits you well.
        </p>

        <Suspense
          fallback={
            <>
              <SizeChartTable chart={STANDARD_MEN_CHART} title="Crew Neck T-shirt · Men" />
              <SizeChartTable chart={STANDARD_WOMEN_CHART} title="Crew Neck T-shirt · Women" />
            </>
          }
        >
          <SizeGuideClient />
        </Suspense>

        <section>
          <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">How to Measure</h2>
          <ul className="space-y-2 text-sm text-[var(--text-muted)] list-disc list-inside">
            <li>
              <strong>Chest / Bust:</strong> measure straight across the garment from armpit to
              armpit, then double it.
            </li>
            <li>
              <strong>Shoulder:</strong> measure straight across the back from one shoulder seam to
              the other.
            </li>
            <li>
              <strong>Length:</strong> measure from the highest point of the shoulder, next to the
              collar, down to the hem.
            </li>
          </ul>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Between two sizes? Choose the larger one for a relaxed fit.
          </p>
        </section>
      </div>
    </div>
  );
}
