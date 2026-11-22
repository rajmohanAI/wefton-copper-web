'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Leaf, Sparkles, Sprout, Hand, Layers } from 'lucide-react';
import { FEATURES } from '@/config/features';

/**
 * Six brand promise sections for the Wefton Copper Vision page.
 * Each section contains a title, 50–150 word descriptive paragraph, and an icon.
 *
 * Requirements: 33.1–33.4
 */
const BRAND_PROMISES = [
  {
    id: 'authenticity',
    icon: Shield,
    title: 'Authenticity Serial Number',
    description:
      'Every Wefton Copper garment carries a unique serial number on its tag, your personal certificate of authenticity. Each serial is registered in our secure database when the garment is tagged, linking it to the exact product, colour, fit and size. Enter the serial at weftoncopper.com/check-product to instantly confirm that your garment is genuine. This protects our customers from counterfeit products and reflects our commitment to transparency in every piece.',
    accent: 'from-[var(--copper-main)]/20',
  },
  {
    id: 'premium-packaging',
    icon: Leaf,
    title: 'Premium Packaging',
    description:
      'Every Wefton Copper order arrives in a carefully designed premium box with tissue wrap and branded elements. Our packaging is crafted to deliver a luxurious unboxing experience that matches the quality of the garment inside. From the outer box to the inner wrap, every detail is considered — making it worthy of gifting without any additional packaging. We use high-quality materials that protect your garment during transit while maintaining an aesthetic you will want to keep and reuse.',
    accent: 'from-emerald-500/20',
  },
  {
    id: 'fabric-freshener',
    icon: Sparkles,
    title: 'Organic Fabric Freshener',
    description:
      'Each Wefton Copper garment arrives with a handcrafted organic fabric freshener pouch, blended from natural essential oils and dried botanicals sourced from sustainable farms across India. Unlike synthetic air fresheners that release harmful chemicals, our freshener uses lavender, eucalyptus, and cedarwood extracts to keep your fabrics smelling naturally fresh. Place the pouch in your wardrobe alongside your Wefton essentials, and it will maintain a subtle, clean fragrance for up to three months. The pouch is refillable — simply add a few drops of your favourite essential oil to extend its life. This thoughtful addition ensures your garments always feel and smell as fresh as the day they arrived.',
    accent: 'from-blue-500/20',
  },
  {
    id: 'plantable-seed-tag',
    icon: Sprout,
    title: 'Plantable Seed Tag',
    description:
      'Every Wefton Copper garment features a plantable seed tag attached to the garment label. Made from biodegradable seed paper embedded with native Indian plant seeds, this tag transforms into a living plant when buried in soil. Simply tear off the tag, place it in a pot with soil, water it, and watch it sprout within days. It comes with a QR code linking to our growing guide, making it accessible for everyone. Our seed tags have already contributed to thousands of plants grown across Indian homes — a small gesture that connects fashion to nature in a meaningful way. Whether you grow herbs for your kitchen, flowers for your balcony, or saplings for your community, each seed represents our shared responsibility toward a greener future.',
    accent: 'from-green-500/20',
  },
  {
    id: 'collapsible-hanger',
    icon: Hand,
    title: 'Collapsible Hanger',
    description:
      'Every Wefton Copper order includes a premium collapsible hanger — a compact, foldable garment hanger designed for modern lifestyles. Whether you\'re travelling, organising a compact wardrobe, or simply need a quick solution to hang your freshly received garment, this lightweight hanger folds flat for easy storage and extends to full size in seconds. Made from reinforced recycled polymer with a soft-grip shoulder design that prevents stretching or creasing of your garment. The hanger accommodates all sizes from XS to XXL and features a rotating hook for closet versatility. A practical everyday essential that reflects Wefton\'s commitment to thoughtful utility.',
    accent: 'from-amber-500/20',
  },
  {
    id: 'craftsmanship',
    icon: Layers,
    title: 'Copper-Stitched Craftsmanship',
    description:
      'At the heart of every Wefton garment lies our signature copper-stitched construction — a technique that merges architectural engineering with textile artistry. We approached the round-neck block like a structural blueprint, eliminating excess fabric and reinforcing every seam with copper-infused threading that provides superior tensile strength. This copper stitching not only strengthens high-stress points like collar joins, shoulder seams, and hem edges, but also adds a distinctive metallic accent visible upon close inspection. The result is a collar that retains its shape wash after wash, seams that resist fraying over years of wear, and a garment that looks as refined on its hundredth day as it did on its first. Each piece undergoes rigorous quality inspection before earning the Wefton Copper mark.',
    accent: 'from-[var(--copper-light)]/20',
  },
];

/** Cards for extras that ship only when FEATURES.packagingExtras is on. */
const PACKAGING_EXTRAS = ['fabric-freshener', 'plantable-seed-tag', 'collapsible-hanger'];

const VISIBLE_PROMISES = BRAND_PROMISES.filter(
  (promise) =>
    (promise.id !== 'craftsmanship' || FEATURES.copperStitchedCraftsmanship) &&
    (!PACKAGING_EXTRAS.includes(promise.id) || FEATURES.packagingExtras),
);

/** What /check-product shows for a genuine serial (WC-Issue-14). */
const SAMPLE_RESULT: [string, string][] = [
  ['Serial', 'WCP01M0105000012'],
  ['Product', '210 GSM 100% cotton, Crew neck half sleeve regular size T-shirt (P01)'],
  ['Colour', 'Olive Green'],
  ['Fit', 'Men'],
  ['Size', 'XL'],
  ['Tagged on', 'November 9, 2026'],
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.165, 0.84, 0.44, 1] as [number, number, number, number] },
  },
};

export default function VisionClient() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Hero Section */}
      <section className="relative py-32 px-4 md:px-8 bg-[var(--bg-darker)] overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 30% 50%, var(--copper-main) 0%, transparent 60%),
                              radial-gradient(ellipse at 70% 50%, var(--copper-light) 0%, transparent 60%)`,
          }}
          aria-hidden="true"
        />

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-6">
            Our Vision
          </p>
          <h1 className="text-5xl md:text-6xl font-light text-[var(--text-light)] leading-tight mb-8">
            More Than a Brand.
            <br />
            <span className="gradient-copper">A Promise.</span>
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            Premium isn&apos;t about logos — it&apos;s about the feeling of the fabric against
            the skin and the confidence of the cut. We are redefining the standard for essential
            wear, starting from the fabric.
          </p>
        </motion.div>
      </section>

      {/* Brand Promise Sections */}
      <section className="py-20 px-4 md:px-8 max-w-[1280px] mx-auto">
        <motion.div
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${
            VISIBLE_PROMISES.length > 2 ? 'lg:grid-cols-3' : 'max-w-4xl mx-auto'
          }`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {VISIBLE_PROMISES.map((promise) => (
            <motion.article
              key={promise.id}
              variants={itemVariants}
              className="glass-card p-8 hover:border-[var(--copper-main)]/30 transition-colors duration-300 group"
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${promise.accent} to-transparent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <promise.icon size={26} className="text-[var(--copper-light)]" />
              </div>
              <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">
                {promise.title}
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {promise.description}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* Authenticity Verification Process */}
      <section className="py-24 px-4 md:px-8 bg-[var(--bg-darker)]">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-[var(--copper-main)]/10 flex items-center justify-center mx-auto mb-6">
              <Shield size={32} className="text-[var(--copper-light)]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)] mb-4">
              Verify Your <span className="gradient-copper">Authenticity</span>
            </h2>
            <p className="text-base text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
              Every Wefton Copper garment comes with a unique serial number that guarantees
              its authenticity. Here&apos;s how the verification process works:
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-30px' }}
          >
            <motion.div variants={itemVariants} className="glass-card p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-sm font-semibold text-[var(--copper-light)]">1</span>
              </div>
              <h3 className="text-base font-medium text-[var(--text-light)] mb-2">
                Locate Your Serial Number
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Find the unique alphanumeric serial number printed on the inner tag of your
                Wefton Copper garment. Each number is unique to your specific product.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-sm font-semibold text-[var(--copper-light)]">2</span>
              </div>
              <h3 className="text-base font-medium text-[var(--text-light)] mb-2">
                Visit the Verification Page
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Go to{' '}
                <Link href="/check-product" className="text-[var(--copper-light)] underline underline-offset-2">
                  weftoncopper.com/check-product
                </Link>{' '}
                and enter your serial number. It is checked against our secure product database.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-sm font-semibold text-[var(--copper-light)]">3</span>
              </div>
              <h3 className="text-base font-medium text-[var(--text-light)] mb-2">
                Receive Confirmation
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Instantly see that your garment is genuine, with its serial, product, colour, fit,
                size and the date it was tagged.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            className="glass-card mt-8 p-6 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-widest uppercase text-[var(--copper-light)] mb-4">
              Sample confirmation
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {SAMPLE_RESULT.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-[var(--text-muted)]">{label}</dt>
                  <dd className={`text-[var(--text-light)] ${label === 'Serial' ? 'font-mono' : ''}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      </section>

      {/* Closing Statement */}
      <section className="py-24 px-4 md:px-8 text-center">
        <motion.blockquote
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-2xl md:text-3xl font-light text-[var(--text-light)] italic leading-relaxed">
            &ldquo;The Wefton Copper Ethos — Premium isn&apos;t about logos; it&apos;s about
            the feeling of the fabric against the skin and the confidence of the cut.&rdquo;
          </p>
          <footer className="mt-6 text-xs tracking-[4px] uppercase text-[var(--copper-light)]">
            — Wefton Copper
          </footer>
        </motion.blockquote>
      </section>
    </div>
  );
}
