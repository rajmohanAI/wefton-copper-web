import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Wefton Copper shipping information — delivery timelines, charges, and tracking details for India.',
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Shipping Policy</h1>
        <p className="text-xs text-[var(--text-faint)] mb-12">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-[var(--text-muted)] leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Delivery Timelines</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Metro Cities</strong> (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata): 3–5 business days</li>
              <li><strong>Tier 2 Cities:</strong> 5–7 business days</li>
              <li><strong>Other Locations:</strong> 7–10 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Shipping Charges</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Orders above ₹999: <strong>Free Shipping</strong></li>
              <li>Orders below ₹999: Flat ₹99 shipping fee</li>
              <li>Express delivery (metro cities only): ₹149 additional</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Order Tracking</h2>
            <p>Once your order is shipped, you will receive a tracking link via email and SMS. You can also track your order from your account page under "My Orders".</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Shipping Partners</h2>
            <p>We partner with leading logistics providers including Delhivery, BlueDart, and DTDC to ensure safe and timely delivery of your Wefton Copper products.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">International Shipping</h2>
            <p>We currently ship within India only. International shipping will be available soon. Subscribe to our newsletter for updates.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
