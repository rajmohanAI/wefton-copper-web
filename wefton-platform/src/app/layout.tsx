import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import AppProviders from '@/components/providers/AppProviders';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Wefton Copper | Premium Cotton Fabric',
    template: '%s | Wefton Copper',
  },
  description:
    'Wefton Copper — Premium Cotton Fabric essentials. Redefining the global standard for essential wear, starting from the thread up.',
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
    title: 'Wefton Copper | Premium Cotton Fabric',
    description:
      'Premium Cotton Fabric essentials. Crafted for the discerning individual.',
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
    title: 'Wefton Copper | Premium Cotton Fabric',
    description: 'Premium Cotton Fabric essentials.',
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
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
