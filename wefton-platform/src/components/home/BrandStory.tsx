'use client';

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Shield, Leaf, Sprout, Sparkles, Hand } from 'lucide-react';

/**
 * Five product differentiators that define the Wefton Copper brand.
 * Each item has an icon, title, and short description (≤ 40 words).
 */
const DIFFERENTIATORS = [
  {
    icon: Shield,
    title: 'Authenticity Serial Number',
    description:
      'Every Wefton garment carries a unique serial number. Verify your product\'s authenticity instantly on our platform — your guarantee of genuine craftsmanship.',
  },
  {
    icon: Leaf,
    title: 'Premium Packaging',
    description:
      'Our packaging reflects the quality inside. Each garment arrives in a beautifully crafted box with tissue wrap, ensuring a luxurious unboxing experience worthy of the Wefton name.',
  },
  {
    icon: Sprout,
    title: 'Seed Bag Inclusion',
    description:
      'Each order includes a seed bag. Plant it, nurture it, and grow something beautiful — our way of giving back to the earth with every purchase.',
  },
  {
    icon: Sparkles,
    title: 'Fabric Freshener',
    description:
      'An organic fabric freshener accompanies every garment. Keep your Wefton essentials smelling fresh naturally, without harsh chemicals or synthetic fragrances.',
  },
  {
    icon: Hand,
    title: 'Collapsible Hanger',
    description:
      'A complimentary collapsible hanger included with every order. Compact and portable — perfect for travel or wardrobe organisation. Keeps your garments wrinkle-free.',
  },
];

/**
 * BrandStory — displays Wefton Copper's 5 product differentiators and
 * a copper-stitched craftsmanship section on the homepage.
 *
 * Uses Framer Motion staggered entrance animations (100ms delay per card)
 * triggered on viewport entry.
 *
 * Requirements: 4.1–4.4
 */
export default function BrandStory() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['5%', '-5%']);

  return (
    <section
      ref={ref}
      className="relative py-24 overflow-hidden bg-[var(--bg-darker)]"
    >
      {/* Background copper gradient */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 opacity-10 pointer-events-none"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 20% 50%, var(--copper-main) 0%, transparent 60%),
                              radial-gradient(ellipse at 80% 50%, var(--copper-light) 0%, transparent 60%)`,
          }}
        />
      </motion.div>

      <div className="relative max-w-[1280px] mx-auto px-4 md:px-8 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-4">
            The Wefton Difference
          </p>
          <h2 className="text-4xl md:text-5xl font-light text-[var(--text-light)] max-w-2xl mx-auto leading-tight text-center">
            More than a garment.
            <br />
            <span className="gradient-copper">An experience.</span>
          </h2>
          <p className="mt-6 text-base text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed text-center">
            Every Wefton Copper product comes with five thoughtful extras that reflect our
            commitment to quality, sustainability, and care.
          </p>
        </motion.div>

        {/* Differentiator Cards — staggered entrance at 100ms per card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {DIFFERENTIATORS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass-card p-6 hover:border-[var(--copper-main)]/30 transition-colors duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--copper-main)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--copper-main)]/20 transition-colors">
                <item.icon size={20} className="text-[var(--copper-light)]" />
              </div>
              <h3 className="text-sm font-medium text-[var(--text-light)] mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Copper-Stitched Craftsmanship Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 glass-card p-8 md:p-12 text-center border-[var(--copper-main)]/20"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--copper-main)]/10 flex items-center justify-center mx-auto mb-6">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--copper-light)]"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="text-2xl md:text-3xl font-light text-[var(--text-light)] mb-4">
            Copper-Stitched Craftsmanship
          </h3>
          <p className="text-sm md:text-base text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed text-center">
            Every Wefton garment features signature copper-stitched seams — a hallmark of our
            dedication to durability and design. The reinforced copper threading strengthens
            structural points while adding a subtle metallic accent that distinguishes genuine
            Wefton Copper from the ordinary. Our architectural collar construction retains its
            shape wash after wash, ensuring your essentials look as refined on day one hundred
            as they did on day one.
          </p>
        </motion.div>

        {/* Vision Quote */}
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-xl md:text-2xl font-light text-[var(--text-light)] italic max-w-2xl mx-auto leading-relaxed">
            &ldquo;The fabric against the skin and the confidence of the cut —
            that is the Wefton promise.&rdquo;
          </p>
          <footer className="mt-4 text-xs tracking-widest uppercase text-[var(--copper-light)]">
            — Wefton Copper
          </footer>
        </motion.blockquote>
      </div>
    </section>
  );
}
