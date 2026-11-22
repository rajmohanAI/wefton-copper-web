import type { Order } from '@/types';
import { formatPrice } from '@/lib/utils';

/**
 * The note shown on the customer's order card after the 10-day
 * "wait or cancel?" email (WC-Issue-20 / WC-Issue-24), so the account page
 * always reflects what the customer was told and what they chose.
 */
export interface OrderDelayNote {
  tone: 'info' | 'waiting' | 'cancelled';
  title: string;
  text: string;
}

type DelayFields = Pick<
  Order,
  'orderStatus' | 'paymentStatus' | 'total' | 'customerChoice' | 'customerChoiceAt' | 'notifications'
>;

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function orderDelayNote(order: DelayFields): OrderDelayNote | null {
  const askedAt = order.notifications?.choiceSentAt;
  const { customerChoice, customerChoiceAt } = order;

  if (customerChoice === 'cancel' && order.orderStatus === 'cancelled') {
    const refunded = order.paymentStatus === 'refunded';
    return {
      tone: 'cancelled',
      title: 'Cancelled at your request',
      text:
        `You chose to cancel this order${customerChoiceAt ? ` on ${day(customerChoiceAt)}` : ''}. ` +
        (refunded
          ? `Your refund of ${formatPrice(order.total)} has been sent to your original payment method.`
          : `Your refund of ${formatPrice(order.total)} is being processed to your original payment method.`),
    };
  }

  // Once the order ships (or ends some other way) the delay note is no longer needed.
  if (!['placed', 'confirmed', 'processing'].includes(order.orderStatus)) return null;

  if (customerChoice === 'wait' && customerChoiceAt && customerChoiceAt >= (askedAt || '')) {
    return {
      tone: 'waiting',
      title: 'Thank you for your patience',
      text:
        `This order is taking longer than usual. On ${day(customerChoiceAt)} you chose to give us more time, ` +
        'and we are working to get it to you. We will email you as soon as it ships. ' +
        'If you change your mind, you can cancel for a full refund through our Contact Us page.',
    };
  }

  if (askedAt) {
    return {
      tone: 'info',
      title: 'Your order is delayed',
      text:
        `This order is taking longer than usual. On ${day(askedAt)} we emailed you to ask whether you would like ` +
        'to wait a little longer or cancel for a full refund. You can answer with the buttons in that email, ' +
        'or reach us through the Contact Us page.',
    };
  }

  return null;
}
