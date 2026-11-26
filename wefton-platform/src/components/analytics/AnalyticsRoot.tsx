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
 * question, Google Analytics and Clarity (each only after its own OK), and the
 * visit's campaign source.
 */
export default function AnalyticsRoot() {
  const consent = useConsent();
  const pathname = usePathname();

  // Kept for this visit only; saved on a sign-up or order after "Allow".
  useEffect(() => {
    captureLanding();
  }, [pathname]);

  return (
    <>
      <GA4Provider consentGranted={consent?.analytics === true} />
      <ClarityProvider consentGranted={consent?.recordings === true} />
      <CookieConsent />
    </>
  );
}
