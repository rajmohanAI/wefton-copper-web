'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Hosting sets NEXT_PUBLIC_GA_MEASUREMENT_ID (apphosting.yaml). The old
// name is still read so a backend that set it keeps working (MRD-01).
const RAW_GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
const GA_ID = /^G-[A-Z0-9]+$/.test(RAW_GA_ID) ? RAW_GA_ID : '';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

interface GA4ProviderProps {
  consentGranted: boolean;
}

/** Loads Google Analytics 4 once the visitor allows analytics cookies. */
export default function GA4Provider({ consentGranted }: GA4ProviderProps) {
  const pathname = usePathname();
  const firstView = useRef(true);

  // gtag('config') records the first page view; later route changes are
  // sent here, so no page is counted twice.
  useEffect(() => {
    if (!consentGranted || !GA_ID) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: pathname,
        page_title: document.title,
      });
    }
  }, [pathname, consentGranted]);

  if (!consentGranted || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
