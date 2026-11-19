import type { Metadata } from 'next';
import { verifyUnsubscribeToken } from '@/lib/newsletter';
import UnsubscribeClient from './UnsubscribeClient';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

/** Where the "Unsubscribe" link in our monthly email leads (WC-Issue-17). */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { t } = await searchParams;
  const token = typeof t === 'string' ? t : '';
  const email = verifyUnsubscribeToken(token);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-24">
      <div className="glass-card max-w-md w-full p-8 text-center">
        <h1 className="text-lg font-medium tracking-wider text-[var(--text-light)] mb-4">Unsubscribe</h1>
        {email ? (
          <UnsubscribeClient token={token} email={email} />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            This unsubscribe link is not valid. Please use the link from your latest email, or write to us at
            sales@weftoncopper.com.
          </p>
        )}
      </div>
    </main>
  );
}
