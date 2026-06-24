import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'Understand the refund and return policy for Wefton Copper. Learn about eligibility, process, and timelines.',
  openGraph: {
    title: 'Refund Policy | Wefton Copper',
    description:
      'Understand the refund and return policy for Wefton Copper. Learn about eligibility, process, and timelines.',
    url: `${siteUrl}/refund-policy`,
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <p className="text-sm text-[var(--color-muted)] mb-2">Last Updated: January 2025</p>
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8">
        Refund Policy
      </h1>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          1. Eligibility
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We want you to be completely satisfied with your purchase. If you are not, you may request
          a return or refund subject to the following conditions:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Return requests must be submitted within 7 days of delivery.</li>
          <li>Items must be unused, unwashed, and in their original packaging with all tags attached.</li>
          <li>Items must not show signs of wear, damage, or alteration.</li>
          <li>Proof of purchase (order confirmation or receipt) is required.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          2. How to Request a Refund
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          To initiate a return or refund, follow these steps:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Log in to your Wefton Copper account and navigate to your order history.</li>
          <li>Select the order containing the item(s) you wish to return.</li>
          <li>Click &quot;Request Return&quot; and select the item(s) and reason for return.</li>
          <li>Add any additional comments to support your request (optional).</li>
          <li>Submit the request and note your return request ID for tracking.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          3. Processing Time
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          Once your return request is submitted, our team will review it within the following
          timelines:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Return requests are reviewed within 3–5 business days.</li>
          <li>You will receive an email notification once your request is approved or rejected.</li>
          <li>If approved, you will receive instructions for shipping the item back.</li>
          <li>Refunds are processed within 5–7 business days after we receive the returned item.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          4. Refund Method
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          Refunds are issued to the original payment method used during purchase.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Credit/debit card refunds may take 5–10 business days to reflect in your statement.</li>
          <li>UPI and net banking refunds are typically processed within 3–5 business days.</li>
          <li>Shipping charges are non-refundable unless the return is due to our error.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          5. Exchanges
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We currently do not offer direct exchanges. If you need a different size or colour, please
          return the original item and place a new order.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Return the original item following the standard return process.</li>
          <li>Place a new order for the desired size or colour.</li>
          <li>The refund for the returned item will be processed separately.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          6. Non-Returnable Items
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          The following items are not eligible for return or refund:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Items marked as &quot;Final Sale&quot; or purchased during clearance events.</li>
          <li>Customised or personalised products.</li>
          <li>Innerwear and accessories for hygiene reasons.</li>
          <li>Items that have been washed, worn, altered, or damaged by the customer.</li>
          <li>Gift cards and vouchers.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          7. Contact
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          If you have any questions about our refund policy or need assistance with a return,
          please contact us at{' '}
          <a
            href="mailto:support@weftoncopper.com"
            className="text-[var(--color-accent)] hover:underline"
          >
            support@weftoncopper.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
