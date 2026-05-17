'use client';

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Leaf, Shield, Zap, Award } from 'lucide-react';

const PILLARS = [
  {
    icon: Shield,
    title: 'Authenticity Guaranteed',
    description:
      'Every Wefton product carries a unique serial number. Verify your product\'s authenticity at weftoncopper.com/verify.',
  },
  {
    icon: Leaf,
    title: 'Plastic-Free Promise',
    description:
      'Our packaging is entirely plastic-free. Repurpose the cover for storage, then dispose responsibly.',
  },
  {
    icon: Zap,
    title: 'Micro-French Terry',
    description:
      'Ultra-lightweight fabric engineered for breathability and drape. A testament to minimalist perfection.',
  },
  {
    icon: Award,
    title: 'Copper-Stitched Seams',
    description:
      'Reinforced copper-stitched seams and architectural collar construction that retains structure wash after wash.',
  },
];

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

      <div className="relative max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-4">
            The Wefton Ethos
          </p>
          <h2 className="text-4xl md:text-5xl font-light text-[var(--text-light)] max-w-2xl mx-auto leading-tight">
            Premium isn&apos;t about logos.
            <br />
            <span className="gradient-copper">It&apos;s about the feeling.</span>
          </h2>
          <p className="mt-6 text-base text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
            We are redefining the global standard for essential wear, starting from the thread up.
            Every stitch, every seam, every fiber — chosen with intention.
          </p>
        </motion.div>

        {/* Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass-card p-6 hover:border-[var(--copper-main)]/30 transition-colors duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--copper-main)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--copper-main)]/20 transition-colors">
                <pillar.icon size={20} className="text-[var(--copper-light)]" />
              </div>
              <h3 className="text-sm font-medium text-[var(--text-light)] mb-2">{pillar.title}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Vision Quote */}
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
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
