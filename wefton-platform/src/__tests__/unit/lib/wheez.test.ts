import { describe, it, expect } from 'vitest';
import {
  REQUEST_ID_PATTERN,
  confirmationMessage,
  contactMatchesOrder,
  deliveredAt,
  isAllowedImage,
  newRequestId,
  returnWindow,
  toDate,
  wheezRequestSchema,
} from '@/lib/wheez';
import { summarizeOrder } from '@/services/wheezServer';

const DAY = 24 * 60 * 60 * 1000;

describe('newRequestId', () => {
  it('uses the India date and a 4-character suffix', () => {
    // 20:00 UTC on 17 Nov is 01:30 on 18 Nov in India.
    const id = newRequestId(new Date('2026-11-17T20:00:00Z'), () => 0);
    expect(id).toBe('WZ-261118-AAAA');
    expect(REQUEST_ID_PATTERN.test(newRequestId())).toBe(true);
  });
});

describe('return window', () => {
  const now = new Date('2026-11-18T10:00:00Z');
  const delivered = (daysAgo: number) => ({
    orderStatus: 'delivered',
    statusHistory: [
      { status: 'shipped', at: new Date(now.getTime() - (daysAgo + 2) * DAY).toISOString() },
      { status: 'delivered', at: new Date(now.getTime() - daysAgo * DAY).toISOString() },
    ],
  });

  it('is open up to 7 days after delivery', () => {
    expect(returnWindow(delivered(3), now)).toBe('open');
    expect(returnWindow(delivered(7), now)).toBe('open');
    expect(returnWindow(delivered(8), now)).toBe('expired');
  });

  it('needs the order to be delivered and not cancelled', () => {
    expect(returnWindow({ orderStatus: 'shipped', statusHistory: [] }, now)).toBe('not_delivered');
    expect(returnWindow({ orderStatus: 'cancelled' }, now)).toBe('cancelled');
  });

  it('keeps the delivery date after the order is closed', () => {
    expect(returnWindow({ ...delivered(2), orderStatus: 'closed' }, now)).toBe('open');
  });

  it('falls back to statusUpdatedAt for delivered orders without history', () => {
    const order = { orderStatus: 'delivered', statusUpdatedAt: { _seconds: (now.getTime() - DAY) / 1000 } };
    expect(deliveredAt(order)?.getTime()).toBe(now.getTime() - DAY);
  });
});

describe('contactMatchesOrder', () => {
  const order = { customerEmail: 'Asha@Example.com', customerPhone: '+91 98765 43210', shippingAddress: { phone: '9000000001' } };
  it('matches the order email ignoring case', () => {
    expect(contactMatchesOrder(order, 'asha@example.com')).toBe(true);
    expect(contactMatchesOrder(order, 'other@example.com')).toBe(false);
  });
  it('matches either phone on the last 10 digits', () => {
    expect(contactMatchesOrder(order, '9876543210')).toBe(true);
    expect(contactMatchesOrder(order, '+91-90000-00001')).toBe(true);
    expect(contactMatchesOrder(order, '43210')).toBe(false);
    expect(contactMatchesOrder(order, '')).toBe(false);
  });
});

describe('wheezRequestSchema', () => {
  it('accepts a complete return', () => {
    const r = wheezRequestSchema.safeParse({ type: 'return', topic: 'wrong_size', outcome: 'replacement', orderId: 'WC-1', items: [0] });
    expect(r.success).toBe(true);
  });
  it('rejects return reasons the policy does not accept', () => {
    const r = wheezRequestSchema.safeParse({ type: 'return', topic: 'changed_mind', outcome: 'refund', orderId: 'WC-1', items: [0] });
    expect(r.success).toBe(false);
  });
  it('needs a description for complaints', () => {
    expect(wheezRequestSchema.safeParse({ type: 'complaint', topic: 'delivery', details: 'late' }).success).toBe(false);
    expect(wheezRequestSchema.safeParse({ type: 'complaint', topic: 'delivery', details: 'It arrived two weeks late.' }).success).toBe(true);
  });
});

describe('helpers', () => {
  it('promises 5–7 business days only for returns', () => {
    expect(confirmationMessage('return', 'WZ-261118-AAAA')).toContain('5–7 business days');
    expect(confirmationMessage('suggestion', 'WZ-261118-AAAA')).not.toContain('business days');
  });
  it('allows only images up to 5 MB', () => {
    expect(isAllowedImage('image/jpeg', 1000)).toBe(true);
    expect(isAllowedImage('application/pdf', 1000)).toBe(false);
    expect(isAllowedImage('image/png', 6 * 1024 * 1024)).toBe(false);
  });
  it('reads Firestore timestamps', () => {
    expect(toDate({ seconds: 0 })?.getTime()).toBe(0);
    expect(toDate('nope')).toBeNull();
  });
  it('summarizes an order without payment or address details', () => {
    const s = summarizeOrder({
      orderId: 'WC-1',
      orderStatus: 'shipped',
      createdAt: '2026-11-10T00:00:00Z',
      trackingNumber: 'TRK1',
      products: [{ title: 'Tee', size: 'M', color: 'Black', quantity: 1, productId: 'p1', price: 999 }],
      shippingAddress: { line1: 'secret' },
      paymentReference: 'secret',
    });
    expect(s.statusLabel).toBe('Shipped');
    expect(s.items[0]).toEqual({ title: 'Tee', size: 'M', color: 'Black', quantity: 1, productId: 'p1' });
    expect(JSON.stringify(s)).not.toContain('secret');
  });
});
