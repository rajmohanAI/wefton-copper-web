'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When true, additionally requires the user to have admin role */
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute wrapper component that checks auth state.
 *
 * - While loading, shows a loading spinner.
 * - Redirects unauthenticated users to the homepage with the AuthModal open.
 * - For admin routes (requireAdmin=true), redirects non-admin users to the homepage.
 *
 * Requirements: 17.3, 17.4, 21.5, 24.5
 */
export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const openAuthModal = useUIStore((state) => state.openAuthModal);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Unauthenticated — redirect to homepage and open AuthModal
      openAuthModal();
      router.replace('/');
      return;
    }

    if (requireAdmin && !isAdmin) {
      // Authenticated but not admin — redirect to homepage
      router.replace('/');
    }
  }, [user, loading, isAdmin, requireAdmin, router, openAuthModal]);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't render children if admin is required but user is not admin
  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
