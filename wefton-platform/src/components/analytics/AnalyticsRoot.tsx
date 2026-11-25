'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureLanding } from '@/lib/attribution';
import { useConsent } from '@/hooks/useConsent';
import GA4Provider from './GA4Provider';
import ClarityProvider from './ClarityProvider';
import CookieConsent from './CookieConsent';

/**
 * Everything measurement-related in one place (MRD-01): the cookie
 * question, Google Analytics and Clarity (only after "Allow"), and the
 * visit's campaign source.
 */
export default function AnalyticsRoot() {
  const granted = useConsent() === 'granted';
  const pathname = usePathname();

  // Kept for this visit only; saved on a sign-up or order after "Allow".
  useEffect(() => {
    captureLanding();
  }, [pathname]);

  return (
    <>
      <GA4Provider consentGranted={granted} />
      <ClarityProvider consentGranted={granted} />
      <CookieConsent />
    </>
  );
}
