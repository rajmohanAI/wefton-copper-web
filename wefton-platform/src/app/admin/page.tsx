import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Wefton Copper admin dashboard for managing orders, products, and analytics.',
  openGraph: {
    title: 'Admin Dashboard | Wefton Copper',
    description: 'Wefton Copper admin dashboard.',
  },
  twitter: {
    card: 'summary',
    title: 'Admin Dashboard | Wefton Copper',
    description: 'Wefton Copper admin dashboard.',
  },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
