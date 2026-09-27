import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Wefton Copper cookie policy — how we use cookies to improve your shopping experience.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Cookie Policy</h1>
        <p className="text-xs text-[var(--text-faint)] mb-12">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-[var(--text-muted)] leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit our website. They help us provide a better shopping experience by remembering your preferences and understanding how you use our site.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Cookies We Use</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the site to function — authentication, cart, and checkout.</li>
              <li><strong>Preference Cookies:</strong> Remember your theme choice (dark/light) and language settings.</li>
              <li><strong>Analytics Cookies:</strong> Google Analytics 4 — helps us understand traffic and improve the site. Only loaded with your consent.</li>
              <li><strong>Marketing Cookies:</strong> Currently not used. We do not serve targeted ads.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Managing Cookies</h2>
            <p>You can control cookies through your browser settings. Disabling essential cookies may affect site functionality (e.g., cart won&apos;t persist). Analytics cookies are only loaded if you grant consent.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Third-Party Cookies</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Firebase Authentication:</strong> Session management cookies for secure login.</li>
              <li><strong>Google Analytics:</strong> Traffic analysis (only with consent).</li>
              <li><strong>Stripe/Payment:</strong> Fraud prevention during checkout.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Contact</h2>
            <p>For questions about our cookie practices, email us at <a href="mailto:sales@weftoncopper.com" className="text-[var(--copper-light)] hover:underline">sales@weftoncopper.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
