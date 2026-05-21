import type { Metadata } from 'next';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Wefton Copper purchase securely.',
  openGraph: {
    title: 'Checkout | Wefton Copper',
    description: 'Complete your Wefton Copper purchase securely.',
  },
  twitter: {
    card: 'summary',
    title: 'Checkout | Wefton Copper',
    description: 'Complete your Wefton Copper purchase securely.',
  },
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutClient />
    </ProtectedRoute>
  );
}
