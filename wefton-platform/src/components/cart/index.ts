import dynamic from 'next/dynamic';

/**
 * Lazy-loaded CartDrawer component.
 * Uses Next.js dynamic() with { ssr: false } to reduce the initial
 * server-rendered bundle size (Requirement 35.6).
 */
export const CartDrawerDynamic = dynamic(
  () => import('./CartDrawer'),
  { ssr: false }
);
