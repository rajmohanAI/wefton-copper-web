import Link from 'next/link';
import Image from 'next/image';
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
    { label: 'Wash Care', href: '/wash-care' },
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
              aria-label="Wefton Copper home"
              className="inline-flex flex-col items-start gap-4 text-[var(--copper-light)] font-bold tracking-[4px] uppercase text-sm"
            >
              <span className="relative">
                {/* Soft copper halo behind the mark */}
                <span
                  aria-hidden
                  className="absolute -inset-4 rounded-full blur-xl"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(214,143,100,0.22) 0%, transparent 70%)' }}
                />
                <Image
                  src="/brand/wefton-mark.png"
                  alt=""
                  width={720}
                  height={464}
                  sizes="96px"
                  className="relative h-14 w-auto drop-shadow-[0_1px_2px_rgba(60,40,25,0.28)]"
                />
              </span>
              WEFTON COPPER
            </Link>
            <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed max-w-xs">
              Redefining the global standard for essential wear, starting from the thread up.
              Premium Cotton Fabric crafted for the discerning individual.
            </p>

            {/* Social */}
            <div className="flex items-center gap-2 mt-6">
              <a
                href={BRAND.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href={BRAND.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href={BRAND.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
            </div>

            {/* Contact */}
            <div className="mt-6 space-y-1">
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              >
                <Mail size={13} />
                {BRAND.email}
              </a>
              <a
                href={`tel:${BRAND.phone}`}
                className="flex items-center gap-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
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
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--border-subtle)] py-5">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
            <Image
              src="/brand/wefton-mark.png"
              alt=""
              width={720}
              height={464}
              sizes="32px"
              className="h-3.5 w-auto opacity-60"
            />
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
