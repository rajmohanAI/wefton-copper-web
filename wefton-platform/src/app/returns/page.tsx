import type { Metadata } from 'next';
import ReturnPolicyContent from '@/components/policy/ReturnPolicyContent';

export const metadata: Metadata = {
  title: 'Return Policy',
  description:
    'Wefton Copper return policy — raise a return within 7 days of receiving your order for a wrong size, colour or gender, a damaged product, or a wrong item.',
};

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Return Policy</h1>
        <p className="text-xs text-[var(--text-faint)] mb-12">Last updated: November 2026</p>
        <ReturnPolicyContent />
      </div>
    </div>
  );
}
