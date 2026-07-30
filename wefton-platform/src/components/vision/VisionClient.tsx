'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Leaf, Shield, Zap, Award, Sprout, Droplets, Scissors } from 'lucide-react';

const VISION_SECTIONS = [
  {
    id: 'authenticity',
    icon: Shield,
    title: 'Authenticity Guaranteed',
    subtitle: 'Every product, verified.',
    description:
      'Wefton promises every product delivered to its customer with a brand promise. A unique serial number will be printed in every product of Wefton. Users can verify the serial at weftoncopper.com/verify to validate the originality of the product.',
    accent: 'from-[var(--copper-main)]/20',
  },
  {
    id: 'sustainability',
    icon: Leaf,
    title: 'Premium Packaging',
    subtitle: 'Unboxing worth the wait.',
    description:
      'Wefton products are free from plastics. Please use the package cover for your storage utilities for a while and dispose them to non-biodegradable waste to help conserve our environment.',
    accent: 'from-emerald-500/20',
  },
  {
    id: 'freshness',
    icon: Droplets,
    title: 'Organic Fabric Freshener',
    subtitle: 'Nature in every fold.',
    description:
      'Wefton provides an organic fabric freshener pouch with every product, to keep your fabric fresh and smell good. You can use them in your wardrobe.',
    accent: 'from-blue-500/20',
  },
  {
    id: 'seeds',
    icon: Sprout,
    title: 'Plantable Seed Tag',
    subtitle: 'Grow with every purchase.',
    description:
      'Every Wefton garment comes with a plantable seed tag. Tear it off, bury it in soil, and watch it grow into a plant. Encourage yourself and your young ones to nurture greenery and conserve the environment.',
    accent: 'from-green-500/20',
  },
  {
    id: 'care',
    icon: Scissors,
    title: 'Collapsible Hanger',
    subtitle: 'Compact. Portable. Essential.',
    description:
      'Wefton provides a collapsible hanger with every order — a compact, foldable garment hanger perfect for travel or wardrobe organisation. Keeps your garments wrinkle-free and ready to wear.',
    accent: 'from-amber-500/20',
  },
  {
    id: 'craftsmanship',
    icon: Award,
    title: 'Copper-Stitched Craftsmanship',
    subtitle: 'Engineering meets elegance.',
    description:
      'We approached the round-neck block like architectural engineering. No excess fabric. Reinforced copper-stitched seams. A collar that retains its structure wash after wash.',
    accent: 'from-[var(--copper-light)]/20',
  },
];

// Extracted card so hooks are called at component level, not inside a loop
function VisionCard({
  section,
  index,
}: {
  section: (typeof VISION_SECTIONS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="glass-card p-8 hover:border-[var(--copper-main)]/30 transition-colors duration-300 group"
    >
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.accent} to-transparent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
      >
        <section.icon size={22} className="text-[var(--copper-light)]" />
      </div>
      <p className="text-xs tracking-widest uppercase text-[var(--copper-light)] mb-2">
        {section.subtitle}
      </p>
      <h3 className="text-lg font-medium text-[var(--text-light)] mb-3">{section.title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{section.description}</p>
    </motion.div>
  );
}

export default function VisionClient() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative py-32 px-4 md:px-8 bg-[var(--bg-darker)] overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 30% 50%, var(--copper-main) 0%, transparent 60%),
                              radial-gradient(ellipse at 70% 50%, var(--copper-light) 0%, transparent 60%)`,
          }}
          aria-hidden
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-6"
          >
            Our Vision
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-6xl font-light text-[var(--text-light)] leading-tight mb-8"
          >
            More Than a Brand.
            <br />
            <span className="gradient-copper">A Promise.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed"
          >
            Premium isn&apos;t about logos; it&apos;s about the feeling of the fabric against the skin
            and the confidence of the cut. We are redefining the global standard for essential wear,
            starting from the thread up.
          </motion.p>
        </div>
      </section>

      {/* Vision Cards */}
      <section className="py-20 px-4 md:px-8 max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VISION_SECTIONS.map((section, i) => (
            <VisionCard key={section.id} section={section} index={i} />
          ))}
        </div>
      </section>

      {/* Closing Statement */}
      <section className="py-24 px-4 md:px-8 bg-[var(--bg-darker)] text-center">
        <div className="max-w-3xl mx-auto">
          <blockquote className="text-2xl md:text-3xl font-light text-[var(--text-light)] italic leading-relaxed">
            &ldquo;The Wefton Copper Ethos — Premium isn&apos;t about logos; it&apos;s about the
            feeling of the fabric against the skin and the confidence of the cut.&rdquo;
          </blockquote>
          <footer className="mt-6 text-xs tracking-[4px] uppercase text-[var(--copper-light)]">
            — Wefton Copper
          </footer>
        </div>
      </section>
    </div>
  );
}
