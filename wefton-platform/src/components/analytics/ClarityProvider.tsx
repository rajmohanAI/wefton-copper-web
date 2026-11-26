'use client';

import Script from 'next/script';

// Microsoft Clarity heatmaps and session recordings (MRD-01). Stays off
// until a backend sets NEXT_PUBLIC_CLARITY_PROJECT_ID.
const RAW_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '';
const CLARITY_ID = /^[a-z0-9]{6,16}$/i.test(RAW_ID) ? RAW_ID : '';

/** Loads Microsoft Clarity once the visitor allows analytics cookies. */
export default function ClarityProvider({ consentGranted }: { consentGranted: boolean }) {
  if (!consentGranted || !CLARITY_ID) return null;
  return (
    <Script id="clarity-init" strategy="lazyOnload">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_ID}");
      `}
    </Script>
  );
}
