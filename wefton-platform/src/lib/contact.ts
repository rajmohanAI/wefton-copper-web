import { z } from 'zod';

/** Topics a customer can pick on the Contact Us form (WC-Issue-9). */
export const CONTACT_TOPICS = [
  { value: 'order', label: 'Order or delivery' },
  { value: 'return', label: 'Return, replacement or refund' },
  { value: 'product', label: 'Product or sizing' },
  { value: 'other', label: 'Something else' },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['value'];

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Please enter a valid email address').max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d\s-]*$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  orderId: z.string().trim().max(40).optional().or(z.literal('')),
  topic: z.enum(['order', 'return', 'product', 'other']),
  message: z
    .string()
    .trim()
    .min(10, 'Please tell us a little more (at least 10 characters)')
    .max(2000, 'Please keep your message under 2000 characters'),
  /** Honeypot: real visitors never see or fill this field. */
  website: z.string().max(0).optional().or(z.literal('')),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export function topicLabel(topic: ContactTopic): string {
  return CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? topic;
}
