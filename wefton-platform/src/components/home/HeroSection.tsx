'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Play } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [videoMode, setVideoMode] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Canvas scroll animation (same as original site)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    const FRAME_COUNT = 240;
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = `/frames/ezgif-frame-${i.toString().padStart(3, '0')}.jpg`;
      img.onload = () => {
        loaded++;
        if (loaded === 1) {
          ctx.drawImage(images[0], 0, 0, canvas.width, canvas.height);
          setCanvasReady(true);
        }
      };
      img.onerror = () => {
        // Frames not available — show fallback gradient
        setCanvasReady(false);
      };
      images.push(img);
    }
    imagesRef.current = images;

    const handleScroll = () => {
      const section = containerRef.current;
      if (!section) return;
      const scrollPos = window.scrollY - section.offsetTop;
      const maxScroll = section.scrollHeight - window.innerHeight;
      let fraction = scrollPos / maxScroll;
      fraction = Math.max(0, Math.min(1, fraction));
      const idx = Math.min(FRAME_COUNT - 1, Math.floor(fraction * FRAME_COUNT));

      if (idx !== frameIndexRef.current && images[idx]?.complete) {
        frameIndexRef.current = idx;
        requestAnimationFrame(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(images[idx], 0, 0, canvas.width, canvas.height);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative"
      style={{ height: '400vh' }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Canvas / Fallback Background */}
        {!canvasReady && (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-darker)] via-[var(--bg-dark)] to-[#1a0f08]">
            {/* Copper particle effect */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 50%, var(--copper-main) 0%, transparent 50%),
                                  radial-gradient(circle at 70% 30%, var(--copper-light) 0%, transparent 40%)`,
              }}
            />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: canvasReady ? 'block' : 'none' }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-dark)]/40 via-transparent to-transparent" />

        {/* Hero Content */}
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-6"
          >
            Premium Lifestyle Brand
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.165, 0.84, 0.44, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-[var(--text-light)] leading-none mb-6"
          >
            Micro-French
            <br />
            <span className="gradient-copper copper-glow-text">Terry</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-base md:text-lg text-[var(--text-muted)] max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Scroll to explore every thread. Crafted for the discerning individual.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/men">
              <Button variant="copper" size="lg">
                Shop Men
              </Button>
            </Link>
            <Link href="/women">
              <Button variant="outline" size="lg">
                Shop Women
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--text-muted)]"
        >
          <span className="text-[10px] tracking-[4px] uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ArrowDown size={16} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
