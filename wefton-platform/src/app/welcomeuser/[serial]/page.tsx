import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BadgeCheck, ChevronRight, SearchX, Star, WashingMachine } from 'lucide-react';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { parseSerial } from '@/lib/serialgen';
import { checkSerial, findSerialProduct, type SerialCheck, type SerialProduct } from '@/services/serialServer';

// Opened from the QR on a garment tag: one page per piece, never cached.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Welcome to Wefton Copper',
  description: 'Your Wefton Copper product, its wash care and a place to review it.',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ serial: string }>;
}

async function lookUp(serial: string): Promise<{ check: SerialCheck | null; product: SerialProduct | null; failed: boolean }> {
  if (!parseSerial(serial)) return { check: null, product: null, failed: false };
  try {
    const db = getAdminDb();
    const check = await checkSerial(db, serial);
    const product = check ? await findSerialProduct(db, check) : null;
    return { check, product, failed: false };
  } catch (error) {
    console.error('[welcomeuser] Lookup failed:', error);
    return { check: null, product: null, failed: true };
  }
}

/**
 * /welcomeuser/WCP01M0103000001 — the page the tag QR opens. Shows the exact
 * product of that serial, with Wash Care and Review Product tiles below it.
 */
export default async function WelcomeUserPage({ params }: Props) {
  const { serial: raw } = await params;
  const serial = decodeURIComponent(raw).toUpperCase();
  const { check, product, failed } = await lookUp(serial);

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <header className="text-center">
          <p className="text-xs tracking-[4px] uppercase text-[var(--copper-light)] mb-3">Welcome</p>
          <h1 className="text-2xl sm:text-3xl font-light text-[var(--text-light)]">Thank you for choosing Wefton Copper</h1>
        </header>

        {check ? <ProductCard check={check} product={product} /> : <NotFound serial={serial} failed={failed} />}

        <nav aria-label="Your product" className="grid grid-cols-2 gap-3">
          <Tile href="/wash-care" icon={<WashingMachine size={26} />} title="Wash Care" text="Keep it looking new" />
          {product ? (
            <Tile
              href={`/products/${product.slug}#reviews`}
              icon={<Star size={26} />}
              title="Review Product"
              text="Tell us how it fits"
            />
          ) : (
            <Tile href="/check-product" icon={<BadgeCheck size={26} />} title="Check Product" text="Enter your serial" />
          )}
        </nav>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Questions? Write to{' '}
          <a href="mailto:sales@weftoncopper.com" className="text-[var(--copper-light)] hover:underline">
            sales@weftoncopper.com
          </a>
        </p>
      </div>
    </div>
  );
}

function ProductCard({ check, product }: { check: SerialCheck; product: SerialProduct | null }) {
  const details = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
        <BadgeCheck size={16} className="flex-shrink-0" /> Genuine Wefton Copper product
      </p>
      <h2 className="text-lg leading-snug font-light text-[var(--text-light)]">{product?.title ?? check.product}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-[var(--text-muted)]">Colour</dt>
        <dd className="text-[var(--text-light)]">{check.color}</dd>
        <dt className="text-[var(--text-muted)]">Size</dt>
        <dd className="text-[var(--text-light)]">{check.size}</dd>
        <dt className="text-[var(--text-muted)]">Fit</dt>
        <dd className="text-[var(--text-light)]">{check.gender}</dd>
        <dt className="text-[var(--text-muted)]">Serial</dt>
        <dd className="font-mono text-[var(--text-light)] break-all">{check.serial}</dd>
      </dl>
    </>
  );

  return (
    <section className="glass-card p-4 sm:p-5 flex gap-4 sm:gap-5">
      {product?.image && (
        <div className="relative w-28 sm:w-40 flex-shrink-0 self-start aspect-[4/5] rounded overflow-hidden bg-[var(--bg-card)]">
          <Image src={product.image.url} alt={product.image.alt} fill priority sizes="160px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 space-y-3">
        {details}
        {product && (
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--copper-light)] hover:underline"
          >
            View in store <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

function NotFound({ serial, failed }: { serial: string; failed: boolean }) {
  return (
    <section className="glass-card p-6 space-y-2">
      <p className="flex items-center gap-2 text-amber-500 font-medium">
        <SearchX size={20} /> {failed ? 'We couldn’t look up your product right now' : 'We couldn’t find this serial'}
      </p>
      <p className="text-sm text-[var(--text-muted)]">
        {failed ? (
          'Please scan the tag again in a moment.'
        ) : (
          <>
            <span className="font-mono break-all">{serial}</span> isn’t a serial we printed. If the tag came with a
            Wefton Copper garment, write to us with a photo of it.
          </>
        )}
      </p>
    </section>
  );
}

function Tile({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="glass-card p-5 flex flex-col items-center text-center gap-2 hover:border-[var(--copper-light)] transition-colors"
    >
      <span className="text-[var(--copper-light)]">{icon}</span>
      <span className="text-sm font-medium text-[var(--text-light)]">{title}</span>
      <span className="text-xs text-[var(--text-muted)]">{text}</span>
    </Link>
  );
}
