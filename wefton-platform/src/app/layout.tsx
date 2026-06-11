import type { Metadata } from 'next';
import '@/styles/globals.css';
import AppProviders from '@/components/providers/AppProviders';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Wefton Copper | Premium Micro-French Terry',
    template: '%s | Wefton Copper',
  },
  description:
    'Wefton Copper — Premium Micro-French Terry essentials. Redefining the global standard for essential wear, starting from the thread up.',
  keywords: [
    'Wefton Copper',
    'premium t-shirts',
    'micro french terry',
    'luxury essentials',
    'premium fashion India',
    'copper brand',
  ],
  authors: [{ name: 'Wefton Copper' }],
  creator: 'Wefton Copper',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'Wefton Copper',
    title: 'Wefton Copper | Premium Micro-French Terry',
    description:
      'Premium Micro-French Terry essentials. Crafted for the discerning individual.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Wefton Copper',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wefton Copper | Premium Micro-French Terry',
    description: 'Premium Micro-French Terry essentials.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <Navbar />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
