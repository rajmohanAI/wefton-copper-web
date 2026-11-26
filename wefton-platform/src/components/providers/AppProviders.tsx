'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { useAuthListener } from '@/hooks/useAuth';
import AnalyticsRoot from '@/components/analytics/AnalyticsRoot';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), { ssr: false });
const SearchOverlay = dynamic(() => import('@/components/search/SearchOverlay'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const SessionTimeout = dynamic(() => import('@/components/auth/SessionTimeout'), { ssr: false });

function AuthListenerWrapper({ children }: { children: React.ReactNode }) {
  useAuthListener();
  return <>{children}</>;
}

function GlobalAuthModal() {
  return <AuthModal />;
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthListenerWrapper>
        <AnalyticsRoot />
        {children}
        <CartDrawer />
        <SearchOverlay />
        <GlobalAuthModal />
        <SessionTimeout />
      </AuthListenerWrapper>
    </ThemeProvider>
  );
}
