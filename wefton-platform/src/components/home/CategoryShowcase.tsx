'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const CATEGORIES = [
  {
    title: "Men's Collection",
    subtitle: 'Premium essentials engineered for precision',
    href: '/men',
    image: '/men_product_01.png',
    accent: 'from-[var(--copper-dark)] to-transparent',
  },
  {
    title: "Women's Collection",
    subtitle: 'Elevated silhouettes for the modern woman',
    href: '/women',
    image: '/women_product_01.png',
    accent: 'from-[#1a0a1a] to-transparent',
  },
];

export default function CategoryShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 px-6 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-light text-[var(--copper-light)]">
          Shop by Collection
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Discover our curated range of premium essentials
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.title}
            initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: i * 0.15, ease: [0.165, 0.84, 0.44, 1] }}
          >
            <Link
              href={cat.href}
              className="group relative block overflow-hidden rounded-xl aspect-[4/5] md:aspect-[3/4] bg-[var(--bg-darker)]"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.accent} opacity-70`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="text-2xl md:text-3xl font-light text-white mb-2">{cat.title}</h3>
                <p className="text-sm text-white/70 mb-4">{cat.subtitle}</p>
                <span className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-[var(--copper-light)] group-hover:gap-3 transition-all">
                  Explore Collection <ArrowRight size={14} />
                </span>
              </div>

              {/* Copper border on hover */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--copper-main)]/40 rounded-xl transition-colors duration-300" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
