import type { Metadata } from 'next';
import ReturnPolicyContent from '@/components/policy/ReturnPolicyContent';
import { withCanonical } from '@/lib/seo';

const description =
  'Wefton Copper refund policy — when a return, replacement or refund is accepted, what to send us, and how refunds are paid.';

export const metadata: Metadata = withCanonical('/refund-policy', {
  title: 'Refund Policy',
  description,
  openGraph: {
    title: 'Refund Policy | Wefton Copper',
    description,
  },
});

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Refund Policy</h1>
        <p className="text-xs text-[var(--text-faint)] mb-12">Last updated: November 2026</p>
        <ReturnPolicyContent />
      </div>
    </div>
  );
}
