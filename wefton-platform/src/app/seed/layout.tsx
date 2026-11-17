import type { Metadata } from 'next';

// Internal data-seeding tool: keep it out of search results.
export const metadata: Metadata = {
  title: 'Seed',
  robots: { index: false, follow: false },
};

export default function SeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
