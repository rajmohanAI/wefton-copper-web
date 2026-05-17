import type { Metadata } from 'next';
import WishlistClient from '@/components/wishlist/WishlistClient';

export const metadata: Metadata = {
  title: 'Wishlist',
  robots: { index: false },
};

export default function WishlistPage() {
  return <WishlistClient />;
}
