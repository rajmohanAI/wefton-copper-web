'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Arjun Mehta',
    location: 'Mumbai',
    rating: 5,
    text: 'The Micro-French Terry fabric is unlike anything I\'ve worn before. Incredibly lightweight yet structured. The copper-stitched seams are a beautiful detail.',
    product: 'Premium Tee',
    avatar: 'AM',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    location: 'Bangalore',
    rating: 5,
    text: 'Finally a brand that understands premium doesn\'t mean uncomfortable. The fit is architectural, the fabric breathes beautifully. Worth every rupee.',
    product: 'Oversized Tee',
    avatar: 'PS',
  },
  {
    id: 3,
    name: 'Rahul Nair',
    location: 'Delhi',
    rating: 5,
    text: 'The serial number verification is a genius touch. Knowing my product is authentic adds to the premium experience. The packaging is also completely plastic-free.',
    product: 'Premium Polo',
    avatar: 'RN',
  },
  {
    id: 4,
    name: 'Sneha Iyer',
    location: 'Chennai',
    rating: 5,
    text: 'I bought the Co-Ords set and received so many compliments. The copper aesthetic is subtle yet distinctive. This is what premium Indian fashion should look like.',
    product: 'Co-Ords',
    avatar: 'SI',
  },
];

export default function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setCurrent((c) => (c + 1) % TESTIMONIALS.length);

  return (
    <section ref={ref} className="py-24 px-6 bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-4">
            What They Say
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-[var(--text-light)]">
            Worn & Loved
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Quote icon */}
          <Quote
            size={48}
            className="absolute -top-4 -left-4 text-[var(--copper-main)]/20"
            aria-hidden
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="glass-card p-8 md:p-12 text-center"
            >
              <StarRating rating={TESTIMONIALS[current].rating} size={18} className="justify-center mb-6" />

              <p className="text-lg md:text-xl font-light text-[var(--text-light)] leading-relaxed mb-8 italic">
                &ldquo;{TESTIMONIALS[current].text}&rdquo;
              </p>

              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/20 border border-[var(--copper-main)]/30 flex items-center justify-center text-xs font-medium text-[var(--copper-light)]">
                  {TESTIMONIALS[current].avatar}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-light)]">
                    {TESTIMONIALS[current].name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {TESTIMONIALS[current].location} · {TESTIMONIALS[current].product}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-6 bg-[var(--copper-main)]'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
