import type { Metadata } from 'next';
import ProtectedRoute from '@/components/ProtectedRoute';
import SerialGenClient from '@/components/serialgen/SerialGenClient';

export const metadata: Metadata = {
  title: 'Serial / Barcode Generator',
  description: 'Admin utility to generate product barcode serials.',
  robots: { index: false, follow: false },
};

export default function SerialGenPage() {
  return (
    <ProtectedRoute requireAdmin>
      <SerialGenClient />
    </ProtectedRoute>
  );
}
