import type { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isOrderChoice, verifyOrderChoiceToken } from '@/lib/orderResponse';
import { getOrderChoiceView, type OrderChoiceView } from '@/services/orderLifecycleServer';
import OrderResponseClient from './OrderResponseClient';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

/** Where the "wait" / "cancel" buttons in the 10-day delay email lead (WC-Issue-20). */
export default async function OrderResponsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { t, choice } = await searchParams;
  const token = typeof t === 'string' ? t : '';
  const orderDocId = verifyOrderChoiceToken(token);
  let view: OrderChoiceView = { state: 'not_found' };
  if (orderDocId) {
    try {
      view = await getOrderChoiceView(getAdminDb(), orderDocId);
    } catch (error) {
      console.error('[Orders] Loading the order for /order-response failed:', error);
    }
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-24">
      <div className="glass-card max-w-md w-full p-8 text-center">
        <h1 className="text-lg font-medium tracking-wider text-[var(--text-light)] mb-4">
          {view.orderId ? `Your order #${view.orderId}` : 'Your order'}
        </h1>
        {view.state === 'not_found' ? (
          <p className="text-sm text-[var(--text-muted)]">
            This link is not valid. Please use the link from your latest email, or write to us at
            sales@weftoncopper.com.
          </p>
        ) : (
          <OrderResponseClient token={token} initial={view} suggested={isOrderChoice(choice) ? choice : undefined} />
        )}
      </div>
    </main>
  );
}
