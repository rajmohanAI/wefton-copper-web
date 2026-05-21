import type { Metadata } from 'next';
import AccountClient from '@/components/account/AccountClient';
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your Wefton Copper account, orders, and addresses.',
  openGraph: {
    title: 'My Account | Wefton Copper',
    description: 'Manage your Wefton Copper account, orders, and addresses.',
  },
  twitter: {
    card: 'summary',
    title: 'My Account | Wefton Copper',
    description: 'Manage your Wefton Copper account.',
  },
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountClient />
    </ProtectedRoute>
  );
}
