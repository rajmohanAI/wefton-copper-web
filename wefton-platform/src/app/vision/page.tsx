import type { Metadata } from 'next';
import VisionClient from '@/components/vision/VisionClient';

export const metadata: Metadata = {
  title: 'Our Vision',
  description:
    'Discover the Wefton Copper vision — authenticity, sustainability, craftsmanship, and a brand promise unlike any other.',
};

export default function VisionPage() {
  return <VisionClient />;
}
