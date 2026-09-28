import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the Terms of Service for Wefton Copper. Understand your rights and obligations when using our platform.',
  openGraph: {
    title: 'Terms of Service | Wefton Copper',
    description:
      'Read the Terms of Service for Wefton Copper. Understand your rights and obligations when using our platform.',
    url: `${siteUrl}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <p className="text-sm text-[var(--color-muted)] mb-2">Last Updated: January 2025</p>
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8">
        Terms of Service
      </h1>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          1. Acceptance of Terms
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          By accessing or using the Wefton Copper platform, you agree to be bound by these Terms of
          Service. If you do not agree to all the terms and conditions, you must not access or use
          our services.
        </p>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          These terms apply to all visitors, users, and customers of the platform. We reserve the
          right to update these terms at any time, and continued use of the platform constitutes
          acceptance of any modifications.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          2. User Accounts
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          When you create an account with us, you must provide accurate and complete information. You
          are responsible for safeguarding the password and for all activities that occur under your
          account.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>You must be at least 18 years of age to create an account.</li>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You must notify us immediately of any unauthorised use of your account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          3. Orders and Payments
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          All orders placed through the platform are subject to acceptance and availability. Prices
          are displayed in Indian Rupees (₹) and include applicable taxes unless stated otherwise.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>We reserve the right to refuse or cancel any order at our discretion.</li>
          <li>Payment must be completed at the time of order placement.</li>
          <li>All payment information is processed securely through our payment partners.</li>
          <li>You agree to provide current, complete, and accurate billing information.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          4. Shipping
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We aim to dispatch all orders within 2–3 business days. Delivery timelines depend on your
          location and the shipping method selected at checkout.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Estimated delivery times are provided for reference and are not guaranteed.</li>
          <li>Risk of loss transfers to you upon delivery to the carrier.</li>
          <li>We are not responsible for delays caused by courier services or customs.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          5. Returns
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We accept returns within 7 days of delivery for eligible items. Please refer to our Refund
          Policy page for detailed information on eligibility and the return process.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Items must be unused, unwashed, and in their original packaging.</li>
          <li>Return requests must be initiated through your account dashboard.</li>
          <li>Refunds are processed within 3–5 business days of receiving the returned item.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          6. Intellectual Property
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          All content on this platform, including text, graphics, logos, images, and software, is the
          property of Wefton Copper and is protected by intellectual property laws.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>You may not reproduce, distribute, or modify any content without written permission.</li>
          <li>The Wefton Copper name, logo, and branding are registered trademarks.</li>
          <li>Unauthorised use of our intellectual property may result in legal action.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          7. Limitation of Liability
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          To the fullest extent permitted by law, Wefton Copper shall not be liable for any
          indirect, incidental, special, or consequential damages arising from your use of the
          platform or purchase of products.
        </p>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          Our total liability shall not exceed the amount paid by you for the specific product or
          service giving rise to the claim.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          8. Governing Law
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          These Terms of Service are governed by and construed in accordance with the laws of India.
          Any disputes arising under these terms shall be subject to the exclusive jurisdiction of
          the courts in New Delhi, India.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          9. Contact
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          If you have any questions about these Terms of Service, please contact us at{' '}
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
