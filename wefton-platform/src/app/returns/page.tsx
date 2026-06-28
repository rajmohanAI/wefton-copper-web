import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Return Policy',
  description: 'Wefton Copper return and exchange policy — 7-day return window, conditions, and refund process.',
};

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Return Policy</h1>
        <p className="text-xs text-[var(--text-faint)] mb-12">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-[var(--text-muted)] leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Return Window</h2>
            <p>We accept returns within <strong>7 days</strong> of delivery. Items must be unworn, unwashed, and in original packaging with all tags attached.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Eligible for Return</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Wrong item delivered</li>
              <li>Defective or damaged product</li>
              <li>Size issue (exchange available)</li>
              <li>Changed mind (within 7 days, unused condition)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Not Eligible for Return</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Items worn, washed, or altered</li>
              <li>Items without original tags and packaging</li>
              <li>Items purchased during final sale events</li>
              <li>Returns requested after 7 days of delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">How to Initiate a Return</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Log into your account and go to "My Orders"</li>
              <li>Select the order and click "Request Return"</li>
              <li>Choose the items and reason for return</li>
              <li>Our team will review and approve within 1–2 business days</li>
              <li>A pickup will be scheduled at your address</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Refund Process</h2>
            <p>Once we receive and inspect the returned item, your refund will be processed within 3–5 business days. Refunds are issued to the original payment method.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Exchanges</h2>
            <p>For size exchanges, we ship the replacement at no additional cost. Subject to stock availability.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
