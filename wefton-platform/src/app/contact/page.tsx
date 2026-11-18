import type { Metadata } from 'next';
import { Mail, Phone, MapPin } from '@/components/ui/SocialIcons';
import { MessageCircle } from 'lucide-react';
import { BRAND } from '@/config/brand';
import ContactForm from '@/components/contact/ContactForm';
import { withCanonical } from '@/lib/seo';

export const metadata: Metadata = withCanonical('/contact', {
  title: 'Contact Us',
  description:
    'Contact Wefton Copper for help with orders, deliveries, returns, sizing or anything else, by WhatsApp, phone, email or the contact form.',
});

const CHANNELS = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: BRAND.phone,
    href: `https://wa.me/${BRAND.whatsapp}`,
    external: true,
    hint: 'Fastest for order and return queries. You can send photos here.',
  },
  {
    icon: Mail,
    label: 'Email',
    value: BRAND.email,
    href: `mailto:${BRAND.email}`,
    external: false,
    hint: 'We reply within 1–2 business days.',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: BRAND.phone,
    href: `tel:${BRAND.phone.replace(/\s/g, '')}`,
    external: false,
    hint: 'Call us for help with an order or a product.',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: BRAND.address,
    href: '',
    external: false,
    hint: 'We are an online store. Orders are shipped across India.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Contact Us</h1>
        <p className="text-[var(--text-muted)] mb-12 max-w-2xl">
          Questions about an order, a delivery, a return or sizing? Reach us on any channel below
          or send a message, and include your order number if you have one.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10">
          <ul className="space-y-4">
            {CHANNELS.map((c) => {
              const inner = (
                <>
                  <span className="w-10 h-10 shrink-0 rounded-lg bg-[var(--copper-main)]/10 flex items-center justify-center">
                    <c.icon size={18} className="text-[var(--copper-light)]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs tracking-widest uppercase text-[var(--text-faint)]">
                      {c.label}
                    </span>
                    <span className="block text-sm text-[var(--text-light)] break-words">{c.value}</span>
                    <span className="block text-xs text-[var(--text-muted)] mt-1">{c.hint}</span>
                  </span>
                </>
              );
              return (
                <li key={c.label}>
                  {c.href ? (
                    <a
                      href={c.href}
                      {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="glass-card p-4 flex gap-4 hover:border-[var(--copper-main)]/40 transition-colors"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="glass-card p-4 flex gap-4">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
