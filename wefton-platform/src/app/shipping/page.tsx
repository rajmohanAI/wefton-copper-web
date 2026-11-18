import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { withCanonical } from '@/lib/seo';

export const metadata: Metadata = withCanonical('/shipping', {
  title: 'Shipping Policy',
  description:
    'Wefton Copper shipping policy — order dispatch within 2–3 business days, delivery through third-party courier services, and our commitment on lost or damaged parcels.',
});

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Shipping Policy</h1>
        <p className="text-xs text-[var(--text-faint)] mb-12">Last updated: November 2026</p>

        <div className="space-y-8 text-sm text-[var(--text-muted)] leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">How We Ship</h2>
            <p>
              Wefton Copper delivers online orders through third-party courier and delivery
              services. We do not currently have an exclusive partnership or contract with any
              single courier or logistics provider; each shipment is booked with an available
              service that serves your delivery address.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Dispatch Time</h2>
            <p>
              Orders are packed and dispatched within <strong>2–3 business days</strong> of order
              confirmation. Business days are Monday to Saturday, excluding public holidays.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Delivery Time</h2>
            <p>
              Once your order is handed over to the courier, the delivery time depends entirely on
              the courier service and your location. For this reason we are unable to promise or
              guarantee a delivery date. Any delivery estimate shared with you is indicative only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Shipping Charges</h2>
            <p>Shipping is free on all orders within India.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Order Updates</h2>
            <p>
              When your order is dispatched we will share the shipment details with you. You can
              also view the status of your order from your account under &ldquo;My Orders&rdquo;.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">
              Lost or Damaged Parcels
            </h2>
            <p>
              Wefton Copper takes responsibility for your parcel until it reaches you. If your
              parcel is lost, or arrives damaged, during transit, please contact us within 7 days
              of the expected delivery or of receiving it, with photos of the parcel and product
              where available. We will arrange a replacement or a full refund, as set out in our{' '}
              <Link href="/returns" className="text-[var(--copper-light)] hover:underline">
                Return Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Delivery Area</h2>
            <p>We currently ship to addresses within India only.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Questions</h2>
            <p>
              For any question about your shipment, write to{' '}
              <a href={`mailto:${BRAND.email}`} className="text-[var(--copper-light)] hover:underline">
                {BRAND.email}
              </a>{' '}
              or message us on{' '}
              <a
                href={`https://wa.me/${BRAND.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--copper-light)] hover:underline"
              >
                WhatsApp
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
