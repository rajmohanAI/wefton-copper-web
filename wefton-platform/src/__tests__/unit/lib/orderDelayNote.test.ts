import { describe, it, expect } from 'vitest';
import { orderDelayNote } from '@/lib/orderDelayNote';
import type { Order } from '@/types';

const base = {
  orderStatus: 'processing',
  paymentStatus: 'verified',
  total: 799,
} as Pick<Order, 'orderStatus' | 'paymentStatus' | 'total' | 'customerChoice' | 'customerChoiceAt' | 'notifications'>;

const asked = { notifications: { choiceSentAt: '2026-11-20T04:00:00.000Z' } };

describe('orderDelayNote', () => {
  it('shows nothing for an order that was never delayed', () => {
    expect(orderDelayNote(base)).toBeNull();
  });

  it('tells the customer we asked them, while no answer has come in', () => {
    const note = orderDelayNote({ ...base, ...asked });
    expect(note?.tone).toBe('info');
    expect(note?.text).toContain('20 November 2026');
  });

  it('confirms the choice to wait', () => {
    const note = orderDelayNote({ ...base, ...asked, customerChoice: 'wait', customerChoiceAt: '2026-11-21T06:00:00.000Z' });
    expect(note?.tone).toBe('waiting');
    expect(note?.text).toContain('you chose to give us more time');
    expect(note?.text).toContain('21 November 2026');
  });

  it('asks again when a newer email went out after an earlier "wait"', () => {
    const note = orderDelayNote({
      ...base,
      customerChoice: 'wait',
      customerChoiceAt: '2026-11-10T06:00:00.000Z',
      notifications: { choiceSentAt: '2026-11-20T04:00:00.000Z' },
    });
    expect(note?.tone).toBe('info');
  });

  it('confirms a cancellation and the refund', () => {
    const due = orderDelayNote({ ...base, ...asked, orderStatus: 'cancelled', paymentStatus: 'refund_due', customerChoice: 'cancel', customerChoiceAt: '2026-11-21T06:00:00.000Z' });
    expect(due?.tone).toBe('cancelled');
    expect(due?.text).toContain('is being processed');
    const done = orderDelayNote({ ...base, ...asked, orderStatus: 'cancelled', paymentStatus: 'refunded', customerChoice: 'cancel' });
    expect(done?.text).toContain('has been sent');
  });

  it('drops the note once the order ships', () => {
    expect(orderDelayNote({ ...base, ...asked, orderStatus: 'shipped', customerChoice: 'wait', customerChoiceAt: '2026-11-21T06:00:00.000Z' })).toBeNull();
  });
});
