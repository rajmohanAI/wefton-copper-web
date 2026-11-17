import { describe, expect, it } from 'vitest';
import { contactSchema, topicLabel } from '@/lib/contact';

const valid = {
  name: 'Asha',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  orderId: '',
  topic: 'return',
  message: 'I received a medium instead of a large.',
  website: '',
};

describe('contactSchema', () => {
  it('accepts a complete message', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });
  it('allows phone and order number to be left out', () => {
    const rest: Record<string, string> = { ...valid };
    delete rest.phone;
    delete rest.orderId;
    expect(contactSchema.safeParse(rest).success).toBe(true);
  });
  it('rejects a bad email, a short message and an unknown topic', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, topic: 'spam' }).success).toBe(false);
  });
  it('rejects letters in the phone number', () => {
    expect(contactSchema.safeParse({ ...valid, phone: 'call me' }).success).toBe(false);
  });
  it('flags a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
  });
  it('labels topics', () => {
    expect(topicLabel('return')).toBe('Return, replacement or refund');
  });
});
