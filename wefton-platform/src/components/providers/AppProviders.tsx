'use client';

import { ThemeProvider } from 'next-themes';
import { useAuthListener } from '@/hooks/useAuth';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchOverlay from '@/components/search/SearchOverlay';

function AuthListenerWrapper({ children }: { children: React.ReactNode }) {
  useAuthListener();
  return <>{children}</>;
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <AuthListenerWrapper>
        {children}
        <CartDrawer />
        <SearchOverlay />
      </AuthListenerWrapper>
    </ThemeProvider>
  );
}
