import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how Wefton Copper collects, uses, and protects your personal information.',
  openGraph: {
    title: 'Privacy Policy | Wefton Copper',
    description:
      'Learn how Wefton Copper collects, uses, and protects your personal information.',
    url: `${siteUrl}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <p className="text-sm text-[var(--color-muted)] mb-2">Last Updated: January 2025</p>
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mb-8">
        Privacy Policy
      </h1>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          1. Information We Collect
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We collect information that you provide directly to us, as well as information collected
          automatically when you use our platform.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Personal information: name, email address, phone number, and delivery address.</li>
          <li>Payment information: processed securely through our payment partners (we do not store card details).</li>
          <li>Account information: login credentials, order history, and preferences.</li>
          <li>Device information: browser type, operating system, IP address, and device identifiers.</li>
          <li>Usage data: pages visited, time spent on pages, and interactions with our platform.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          2. How We Use Information
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We use the information we collect to provide, maintain, and improve our services.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Processing and fulfilling your orders.</li>
          <li>Sending order confirmations, shipping updates, and delivery notifications.</li>
          <li>Providing customer support and responding to inquiries.</li>
          <li>Personalising your shopping experience and recommendations.</li>
          <li>Analysing usage patterns to improve platform performance and features.</li>
          <li>Sending promotional communications (with your consent).</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          3. Information Sharing
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We do not sell your personal information to third parties. We may share your information in
          the following circumstances:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>With shipping partners to fulfil and deliver your orders.</li>
          <li>With payment processors to complete transactions securely.</li>
          <li>With analytics providers to understand platform usage (in aggregated form).</li>
          <li>When required by law or to protect our legal rights.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          4. Data Security
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We implement appropriate technical and organisational measures to protect your personal
          information against unauthorised access, alteration, disclosure, or destruction.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>All data transmissions are encrypted using TLS/SSL protocols.</li>
          <li>Access to personal data is restricted to authorised personnel only.</li>
          <li>We regularly review and update our security practices.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          5. Cookies
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          We use cookies and similar tracking technologies to enhance your experience on our
          platform.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Essential cookies: required for platform functionality (authentication, cart).</li>
          <li>Analytics cookies: help us understand how visitors interact with our platform.</li>
          <li>Preference cookies: remember your settings such as theme preference.</li>
          <li>You can manage cookie preferences through your browser settings.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          6. Your Rights
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed mb-4">
          You have the following rights regarding your personal information:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-base text-[var(--color-muted-foreground)] leading-relaxed">
          <li>Access: request a copy of the personal data we hold about you.</li>
          <li>Correction: request correction of inaccurate or incomplete data.</li>
          <li>Deletion: request deletion of your personal data (subject to legal obligations).</li>
          <li>Opt-out: unsubscribe from promotional communications at any time.</li>
          <li>Portability: request your data in a structured, machine-readable format.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          7. Children&apos;s Privacy
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          Our platform is not intended for children under 18 years of age. We do not knowingly
          collect personal information from children. If we become aware that we have collected
          personal data from a child, we will take steps to delete that information promptly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          8. Changes to This Policy
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by posting the new policy on this page and updating the &quot;Last Updated&quot;
          date. Your continued use of the platform after changes are posted constitutes acceptance
          of the updated policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[var(--color-foreground)] mb-4">
          9. Contact
        </h2>
        <p className="text-base text-[var(--color-muted-foreground)] leading-relaxed">
          If you have any questions about this Privacy Policy or wish to exercise your rights,
          please contact us at{' '}
          <a
            href="mailto:privacy@weftoncopper.com"
            className="text-[var(--color-accent)] hover:underline"
          >
            privacy@weftoncopper.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
