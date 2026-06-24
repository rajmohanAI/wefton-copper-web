'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { Instagram, Facebook, Twitter } from '@/components/ui/SocialIcons';
import Button from '@/components/ui/Button';

/* ─── Brand Timeline Milestones ─── */
const MILESTONES = [
  {
    year: '2024',
    title: 'The Idea',
    description:
      'Born from a desire to create premium essentials that feel as good as they look — redefining what everyday wear can be.',
  },
  {
    year: '2025',
    title: 'First Thread',
    description:
      'Sourced the finest Micro-French Terry fabric from ethical mills. Months of R&D perfecting the ideal weight, drape, and softness.',
  },
  {
    year: '2025',
    title: 'Copper Stitch',
    description:
      'Developed the signature copper-stitched seam — a reinforced detail that became our hallmark of durability and craftsmanship.',
  },
  {
    year: '2026',
    title: 'Launch',
    description:
      'Wefton Copper launches with a promise: every product verified with a unique serial number, every thread intentional, every package plastic-free.',
  },
];

/* ─── Social Media Links ─── */
const SOCIAL_LINKS = [
  {
    name: 'Instagram',
    icon: Instagram,
    href: 'https://instagram.com/weftoncopper',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    href: 'https://facebook.com/weftoncopper',
  },
  {
    name: 'Twitter',
    icon: Twitter,
    href: 'https://twitter.com/weftoncopper',
  },
];

/* ─── Milestone Item Component ─── */
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
      transition={{ duration: 0.7, delay: index * 0.1 }}
      className="flex gap-6 md:gap-8 items-start"
    >
      {/* Year marker */}
      <div className="flex-shrink-0 w-14 md:w-16 text-right pt-1">
        <span className="text-xs font-medium text-[var(--copper-light)] tracking-widest">
          {milestone.year}
        </span>
      </div>

      {/* Vertical line with dot */}
      <div className="flex-shrink-0 w-px bg-[var(--border-subtle)] self-stretch relative">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--copper-main)] border-2 border-[var(--bg-dark)]" />
      </div>

      {/* Content */}
      <div className="pb-10">
        <h3 className="text-lg font-medium text-[var(--text-light)] mb-2">
          {milestone.title}
        </h3>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-md">
          {milestone.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Main AboutClient Component ─── */
export default function AboutClient() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });

  const missionRef = useRef<HTMLDivElement>(null);
  const missionInView = useInView(missionRef, { once: true, margin: '-80px' });

  const sustainRef = useRef<HTMLDivElement>(null);
  const sustainInView = useInView(sustainRef, { once: true, margin: '-80px' });

  const contactRef = useRef<HTMLDivElement>(null);
  const contactInView = useInView(contactRef, { once: true, margin: '-80px' });

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* ─── Hero Section ─── */}
      <section
        ref={heroRef}
        className="relative py-32 px-4 md:px-8 bg-[var(--bg-darker)] overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 50% 50%, var(--copper-main) 0%, transparent 70%)`,
          }}
          aria-hidden="true"
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

      {/* ─── Brand Timeline ─── */}
      <section className="py-20 px-4 md:px-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-light text-[var(--text-light)] text-center mb-16">
          Our <span className="gradient-copper">Journey</span>
        </h2>
        <div className="space-y-0">
          {MILESTONES.map((m, i) => (
            <MilestoneItem key={`${m.year}-${m.title}`} milestone={m} index={i} />
          ))}
        </div>
      </section>

      {/* ─── Mission Statement ─── */}
      <section
        ref={missionRef}
        className="py-20 px-4 md:px-8 bg-[var(--bg-darker)]"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={missionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-4">
              Our Mission
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)] leading-tight mb-8">
              Redefining Premium Essentials
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={missionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-card p-8 md:p-12"
          >
            <blockquote className="text-lg md:text-xl text-[var(--text-light)] font-light leading-relaxed italic text-center">
              &ldquo;To craft the world&apos;s finest everyday essentials — garments that honour the
              body, respect the earth, and elevate the ordinary into the extraordinary. We believe
              premium should be accessible, sustainable, and intentional in every stitch.&rdquo;
            </blockquote>
            <p className="text-sm text-[var(--text-muted)] text-center mt-6 leading-relaxed max-w-2xl mx-auto">
              At Wefton Copper, we exist to bridge the gap between luxury and everyday wear. Our
              Micro-French Terry fabric is engineered for comfort, durability, and a premium hand-feel
              that lasts. Every decision — from sourcing to stitching — is guided by our commitment to
              quality without compromise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Sustainability & Ethical Manufacturing ─── */}
      <section
        ref={sustainRef}
        className="py-20 px-4 md:px-8"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={sustainInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-4">
              Sustainability
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)] leading-tight">
              Ethical by Design
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={sustainInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium text-[var(--text-light)] mb-3">
                Plastic-Free Packaging
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Every Wefton product ships in 100% plastic-free packaging. Our biodegradable
                materials protect both your garment and the planet. We encourage reusing our
                packaging covers before responsible disposal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={sustainInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium text-[var(--text-light)] mb-3">
                Ethical Sourcing
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Our Micro-French Terry fabric is sourced from certified ethical mills that ensure
                fair wages, safe working conditions, and environmentally responsible production
                processes at every stage.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={sustainInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium text-[var(--text-light)] mb-3">
                Seed Bag Initiative
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Every purchase includes a seed bag — our way of giving back to nature. We encourage
                customers and their families to plant trees and contribute to a greener future, one
                order at a time.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={sustainInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium text-[var(--text-light)] mb-3">
                Built to Last
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Sustainability starts with durability. Our copper-stitched seams and premium fabric
                are engineered to withstand hundreds of washes, reducing the need for frequent
                replacements and minimising textile waste.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Contact Information ─── */}
      <section
        ref={contactRef}
        className="py-20 px-4 md:px-8 bg-[var(--bg-darker)]"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={contactInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-4">
              Get In Touch
            </p>
            <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)] leading-tight">
              We&apos;d Love to Hear From You
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={contactInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-card p-8 md:p-12"
          >
            {/* Email & Phone */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-10">
              <a
                href="mailto:weftoncopper@gmail.com"
                className="flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/10 flex items-center justify-center group-hover:bg-[var(--copper-main)]/20 transition-colors">
                  <Mail size={18} className="text-[var(--copper-light)]" />
                </div>
                <span className="text-sm">weftoncopper@gmail.com</span>
              </a>

              <a
                href="tel:+918056135201"
                className="flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/10 flex items-center justify-center group-hover:bg-[var(--copper-main)]/20 transition-colors">
                  <Phone size={18} className="text-[var(--copper-light)]" />
                </div>
                <span className="text-sm">+91 80561 35201</span>
              </a>
            </div>

            {/* Social Media Links */}
            <div className="border-t border-[var(--border-subtle)] pt-8">
              <p className="text-xs tracking-[4px] uppercase text-[var(--text-muted)] text-center mb-6">
                Follow Us
              </p>
              <div className="flex items-center justify-center gap-6">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Follow Wefton Copper on ${social.name}`}
                    className="w-12 h-12 rounded-full bg-white/5 border border-[var(--border-subtle)] flex items-center justify-center hover:border-[var(--copper-main)] hover:bg-[var(--copper-main)]/10 transition-all duration-300 group"
                  >
                    <social.icon
                      size={20}
                      className="text-[var(--text-muted)] group-hover:text-[var(--copper-light)] transition-colors"
                    />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 px-4 md:px-8 text-center">
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
