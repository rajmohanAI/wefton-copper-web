import Link from 'next/link';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from '@/components/ui/SocialIcons';
import { BRAND } from '@/config/brand';
import NewsletterForm from './NewsletterForm';

const FOOTER_LINKS = {
  Shop: [
    { label: "Men's Collection", href: '/men' },
    { label: "Women's Collection", href: '/women' },
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'Bestsellers', href: '/bestsellers' },
  ],
  Company: [
    { label: 'Our Vision', href: '/vision' },
    { label: 'About Us', href: '/about' },
    { label: 'Sustainability', href: '/vision#sustainability' },
    { label: 'Craftsmanship', href: '/vision#craftsmanship' },
  ],
  Support: [
    { label: 'Size Guide', href: '/size-guide' },
    { label: 'Shipping Policy', href: '/shipping' },
    { label: 'Return Policy', href: '/returns' },
    { label: 'Contact Us', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Cookie Policy', href: '/cookies' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[var(--bg-darker)] border-t border-[var(--border-subtle)]">
      {/* Main Footer */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="text-[var(--copper-light)] font-bold tracking-[4px] uppercase text-sm"
            >
              WEFTON COPPER
            </Link>
            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed max-w-xs">
              Redefining the global standard for essential wear, starting from the thread up.
              Premium Micro-French Terry crafted for the discerning individual.
            </p>

            {/* Social */}
            <div className="flex items-center gap-4 mt-6">
              <a
                href={BRAND.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href={BRAND.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href={BRAND.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
            </div>

            {/* Contact */}
            <div className="mt-6 space-y-2">
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              >
                <Mail size={13} />
                {BRAND.email}
              </a>
              <a
                href={`tel:${BRAND.phone}`}
                className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              >
                <Phone size={13} />
                {BRAND.phone}
              </a>
              <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <MapPin size={13} />
                {BRAND.address}
              </span>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-light)] mb-4 mt-8 first:mt-0">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-sm font-medium tracking-wider text-[var(--text-light)]">
                Join the Wefton Circle
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Early access, exclusive drops, and brand stories.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
        {/* Google Maps Location */}
        <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium tracking-wider text-[var(--text-light)]">
                Visit Us
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Wefton Copper — Chennai, India
              </p>
            </div>
            <a
              href="https://maps.app.goo.gl/r82wZXHQRbgeAk4X8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--copper-light)] hover:underline"
            >
              Open in Google Maps →
            </a>
          </div>
          <div className="w-full h-[250px] rounded-xl overflow-hidden border border-[var(--border-subtle)]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d80.2209!3d13.0878!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDA1JzE2LjEiTiA4MMKwMTMnMTUuMiJF!5e0!3m2!1sen!2sin!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Wefton Copper Location"
            />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--border-subtle)] py-5">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-faint)]">
            © 2026 Wefton Copper. All rights reserved.
          </p>
          <p className="text-xs text-[var(--text-faint)]">
            Crafted with precision. Delivered with care.
          </p>
        </div>
      </div>
    </footer>
  );
}
