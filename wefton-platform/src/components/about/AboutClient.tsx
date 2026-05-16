'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import Button from '@/components/ui/Button';

const MILESTONES = [
  {
    year: '2024',
    title: 'The Idea',
    desc: 'Born from a desire to create premium essentials that feel as good as they look.',
  },
  {
    year: '2025',
    title: 'First Thread',
    desc: 'Sourced the finest Micro-French Terry fabric. Months of R&D on the perfect weight and drape.',
  },
  {
    year: '2025',
    title: 'Copper Stitch',
    desc: 'Developed the signature copper-stitched seam — a detail that became our hallmark.',
  },
  {
    year: '2026',
    title: 'Launch',
    desc: 'Wefton Copper launches with a promise: every product verified, every thread intentional.',
  },
];

// Extracted so hooks are called at component level, not inside a loop
function MilestoneItem({
  milestone,
  index,
}: {
  milestone: (typeof MILESTONES)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="flex gap-8 items-start"
    >
      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-xs font-medium text-[var(--copper-light)] tracking-widest">
          {milestone.year}
        </span>
      </div>
      <div className="flex-shrink-0 w-px bg-[var(--border-subtle)] self-stretch relative">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--copper-main)] border-2 border-[var(--bg-dark)]" />
      </div>
      <div className="pb-8">
        <h3 className="text-lg font-medium text-[var(--text-light)] mb-2">{milestone.title}</h3>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{milestone.desc}</p>
      </div>
    </motion.div>
  );
}

export default function AboutClient() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative py-32 px-6 bg-[var(--bg-darker)] overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 50% 50%, var(--copper-main) 0%, transparent 70%)`,
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
            Our Story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-6xl font-light text-[var(--text-light)] leading-tight mb-8"
          >
            The Wefton Copper
            <br />
            <span className="gradient-copper">Ethos</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed"
          >
            Premium isn&apos;t about logos; it&apos;s about the feeling of the fabric against the
            skin and the confidence of the cut. We are redefining the global standard for essential
            wear, starting from the thread up.
          </motion.p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <div className="space-y-12">
          {MILESTONES.map((m, i) => (
            <MilestoneItem key={m.title} milestone={m} index={i} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[var(--bg-darker)] text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-light text-[var(--text-light)] mb-4">
            Wear the difference.
          </h2>
          <p className="text-[var(--text-muted)] mb-8">
            Every stitch tells a story. Start yours today.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/men">
              <Button variant="copper" size="lg">Shop Men</Button>
            </Link>
            <Link href="/women">
              <Button variant="outline" size="lg">Shop Women</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
