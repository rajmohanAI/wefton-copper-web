'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, BadgeCheck } from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import StarRating from '@/components/ui/StarRating';

// ============================================================
// Types
// ============================================================

interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  verified: boolean;
  avatar?: string;
  location?: string;
  product?: string;
}

// ============================================================
// Static fallback testimonials (used when Firestore is unavailable)
// ============================================================

const STATIC_TESTIMONIALS: Testimonial[] = [
  {
    id: 'static-1',
    name: 'Arjun Mehta',
    location: 'Mumbai',
    rating: 5,
    text: 'The Micro-French Terry fabric is unlike anything I\'ve worn before. Incredibly lightweight yet structured. The copper-stitched seams are a beautiful detail.',
    product: 'Premium Tee',
    verified: true,
    avatar: 'AM',
  },
  {
    id: 'static-2',
    name: 'Priya Sharma',
    location: 'Bangalore',
    rating: 5,
    text: 'Finally a brand that understands premium doesn\'t mean uncomfortable. The fit is architectural, the fabric breathes beautifully. Worth every rupee.',
    product: 'Oversized Tee',
    verified: true,
    avatar: 'PS',
  },
  {
    id: 'static-3',
    name: 'Rahul Nair',
    location: 'Delhi',
    rating: 5,
    text: 'The serial number verification is a genius touch. Knowing my product is authentic adds to the premium experience. The packaging is also completely plastic-free.',
    product: 'Premium Polo',
    verified: true,
    avatar: 'RN',
  },
  {
    id: 'static-4',
    name: 'Sneha Iyer',
    location: 'Chennai',
    rating: 5,
    text: 'I bought the Co-Ords set and received so many compliments. The copper aesthetic is subtle yet distinctive. This is what premium Indian fashion should look like.',
    product: 'Co-Ords',
    verified: true,
    avatar: 'SI',
  },
];

// ============================================================
// Auto-advance interval (ms)
// ============================================================

const AUTO_ADVANCE_INTERVAL = 5000;

// ============================================================
// Component
// ============================================================

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  const [testimonials, setTestimonials] = useState<Testimonial[]>(STATIC_TESTIMONIALS);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // --------------------------------------------------------
  // Fetch verified reviews from Firestore
  // --------------------------------------------------------
  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const db = getFirebaseDb();
        if (!db) return; // Firestore not configured — keep static fallback

        const q = query(
          collection(db, 'reviews'),
          where('verified', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
        );

        const snap = await getDocs(q);

        if (snap.empty) return; // No verified reviews — keep static fallback

        const fetched: Testimonial[] = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.userName ?? 'Customer',
            rating: data.rating ?? 5,
            text: data.comment ?? '',
            verified: true,
            avatar: data.userAvatar ?? undefined,
            location: data.location ?? undefined,
            product: data.productTitle ?? undefined,
          };
        });

        if (fetched.length >= 3) {
          setTestimonials(fetched);
        }
        // If fewer than 3 fetched, keep static fallback for a better UX
      } catch {
        // Firestore unavailable — keep static fallback silently
      }
    }

    fetchTestimonials();
  }, []);

  // --------------------------------------------------------
  // Auto-advance carousel
  // --------------------------------------------------------
  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    if (isPaused || testimonials.length <= 1) return;

    const interval = setInterval(advance, AUTO_ADVANCE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, advance, testimonials.length]);

  // --------------------------------------------------------
  // Navigation handlers
  // --------------------------------------------------------
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  // --------------------------------------------------------
  // Pause handlers (hover + focus)
  // --------------------------------------------------------
  const handlePause = () => setIsPaused(true);
  const handleResume = () => setIsPaused(false);

  // --------------------------------------------------------
  // Get initials for avatar fallback
  // --------------------------------------------------------
  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const currentTestimonial = testimonials[current];

  return (
    <section ref={sectionRef} className="py-24 px-4 md:px-8 bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
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
            Worn &amp; Loved
          </h2>
        </motion.div>

        {/* Carousel container — pause on hover and focus */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
          onMouseEnter={handlePause}
          onMouseLeave={handleResume}
          onFocus={handlePause}
          onBlur={handleResume}
          role="region"
          aria-label="Customer testimonials carousel"
          aria-roledescription="carousel"
        >
          {/* Quote icon */}
          <Quote
            size={48}
            className="absolute -top-4 -left-4 text-[var(--copper-main)]/20"
            aria-hidden="true"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="glass-card p-8 md:p-12 text-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`Testimonial ${current + 1} of ${testimonials.length}`}
            >
              {/* Star rating */}
              <StarRating
                rating={currentTestimonial.rating}
                size={18}
                className="justify-center mb-6"
              />

              {/* Review text */}
              <p className="text-lg md:text-xl font-light text-[var(--text-light)] leading-relaxed mb-8 italic">
                &ldquo;{currentTestimonial.text}&rdquo;
              </p>

              {/* Reviewer info */}
              <div className="flex items-center justify-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--copper-main)]/20 border border-[var(--copper-main)]/30 flex items-center justify-center text-xs font-medium text-[var(--copper-light)]">
                  {currentTestimonial.avatar || getInitials(currentTestimonial.name)}
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-[var(--text-light)]">
                      {currentTestimonial.name}
                    </p>
                    {/* Verified purchase badge */}
                    {currentTestimonial.verified && (
                      <BadgeCheck
                        size={14}
                        className="text-[var(--copper-light)]"
                        aria-label="Verified purchase"
                      />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {[currentTestimonial.location, currentTestimonial.product]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation — shown when more than 3 testimonials */}
          {testimonials.length > 3 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Navigation dots */}
              <div className="flex gap-2" role="tablist" aria-label="Testimonial navigation">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    role="tab"
                    aria-selected={i === current}
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
          )}
        </motion.div>
      </div>
    </section>
  );
}
