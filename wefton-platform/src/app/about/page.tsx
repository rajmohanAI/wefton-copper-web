import type { Metadata } from 'next';
import { Suspense } from 'react';
import AboutClient from '@/components/about/AboutClient';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Wefton Copper — the brand redefining premium essential wear from the thread up.',
};

export default function AboutPage() {
  return (
    <Suspense>
      <AboutClient />
    </Suspense>
  );
}
