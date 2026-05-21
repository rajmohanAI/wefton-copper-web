import type { Metadata } from 'next';
import WishlistClient from '@/components/wishlist/WishlistClient';
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Your saved Wefton Copper favourites.',
  openGraph: {
    title: 'Wishlist | Wefton Copper',
    description: 'Your saved Wefton Copper favourites.',
  },
  twitter: {
    card: 'summary',
    title: 'Wishlist | Wefton Copper',
    description: 'Your saved Wefton Copper favourites.',
  },
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <ProtectedRoute>
      <WishlistClient />
    </ProtectedRoute>
  );
}
