'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Hero product images used for the scroll-driven canvas animation fallback
 * and preloaded via Next.js <Image> with priority for LCP optimization.
 * At least 5 images are loaded; frame advances proportional to scroll offset.
 * Uses WebP-compatible format with explicit dimensions to prevent layout shift.
 */
const HERO_IMAGES = [
  { src: '/men_product_01.png', width: 800, height: 1000, alt: 'Wefton Copper premium men\'s micro-french terry tee - navy' },
  { src: '/men_product_02.png', width: 800, height: 1000, alt: 'Wefton Copper premium men\'s micro-french terry tee - black' },
  { src: '/men_product_03.png', width: 800, height: 1000, alt: 'Wefton Copper premium men\'s micro-french terry tee - olive' },
  { src: '/women_product_01.png', width: 800, height: 1000, alt: 'Wefton Copper premium women\'s micro-french terry top - blush' },
  { src: '/women_product_02.png', width: 800, height: 1000, alt: 'Wefton Copper premium women\'s micro-french terry top - cream' },
  { src: '/men_product_04.png', width: 800, height: 1000, alt: 'Wefton Copper premium men\'s micro-french terry tee - grey' },
];

/** Total frame count from the /frames directory for the canvas animation */
const FRAME_COUNT = 240;

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Detect prefers-reduced-motion: reduce
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  /**
   * Scroll handler for product image mode — advances through product images
   * proportional to scroll offset.
   */
  function setupProductScrollHandler(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    productImages: HTMLImageElement[]
  ) {
    const handleProductScroll = () => {
      const section = containerRef.current;
      if (!section) return;

      const scrollPos = window.scrollY - section.offsetTop;
      const maxScroll = section.scrollHeight - window.innerHeight;
      let fraction = scrollPos / maxScroll;
      fraction = Math.max(0, Math.min(1, fraction));
      const idx = Math.min(
        productImages.length - 1,
        Math.floor(fraction * productImages.length)
      );

      if (idx !== frameIndexRef.current && productImages[idx]?.complete) {
        frameIndexRef.current = idx;
        requestAnimationFrame(() => {
          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(productImages[idx], 0, 0, canvas.width, canvas.height);
          } catch {
            // Silently handle draw errors
          }
        });
      }
    };

    window.addEventListener('scroll', handleProductScroll, { passive: true });
  }

  /**
   * Fallback: load product images directly onto canvas when frame images fail.
   * Cycles through at least 5 product images based on scroll position.
   */
  function loadProductImagesOnCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    const productImages: HTMLImageElement[] = [];
    let productLoaded = 0;

    HERO_IMAGES.forEach((imgData) => {
      const img = new window.Image();
      img.src = imgData.src;
      img.onload = () => {
        productLoaded++;
        if (productLoaded === 1) {
          try {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setCanvasReady(true);
          } catch {
            setCanvasFailed(true);
          }
        }
        // Once all product images loaded, set up product-based scroll handler
        if (productLoaded === HERO_IMAGES.length) {
          imagesRef.current = productImages;
          setupProductScrollHandler(canvas, ctx, productImages);
        }
      };
      img.onerror = () => {
        // If product images also fail, fall back to CSS animation
        setCanvasFailed(true);
      };
      productImages.push(img);
    });
  }

  // Canvas scroll-driven animation (only when motion is allowed)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;

    // Gracefully handle canvas context initialization failure
    try {
      ctx = canvas.getContext('2d');
    } catch {
      // Canvas context failed — trigger CSS fallback without throwing
      setCanvasFailed(true);
      return;
    }

    if (!ctx) {
      // Canvas context unavailable (e.g., unsupported browser)
      setCanvasFailed(true);
      return;
    }

    ctxRef.current = ctx;
    canvas.width = 1920;
    canvas.height = 1080;

    const images: HTMLImageElement[] = [];
    let loaded = 0;
    let hasError = false;
    let framesFailedCount = 0;

    // Load frame images for smooth scroll-driven animation
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new window.Image();
      img.src = `/frames/ezgif-frame-${i.toString().padStart(3, '0')}.jpg`;
      img.onload = () => {
        loaded++;
        // Draw first frame as soon as it's ready
        if (loaded === 1 && !hasError) {
          try {
            ctx!.drawImage(images[0], 0, 0, canvas.width, canvas.height);
            setCanvasReady(true);
          } catch {
            setCanvasFailed(true);
          }
        }
      };
      img.onerror = () => {
        framesFailedCount++;
        // If more than half the frames fail, fall back to product image mode
        if (framesFailedCount > FRAME_COUNT / 2 && !hasError) {
          hasError = true;
          // Try product image fallback on canvas
          loadProductImagesOnCanvas(canvas, ctx!);
        }
      };
      images.push(img);
    }
    imagesRef.current = images;

    // Scroll handler — advances frame proportional to scroll offset
    const handleScroll = () => {
      const section = containerRef.current;
      if (!section || !ctx) return;

      const scrollPos = window.scrollY - section.offsetTop;
      const maxScroll = section.scrollHeight - window.innerHeight;
      let fraction = scrollPos / maxScroll;
      fraction = Math.max(0, Math.min(1, fraction));
      const idx = Math.min(FRAME_COUNT - 1, Math.floor(fraction * FRAME_COUNT));

      if (idx !== frameIndexRef.current && images[idx]?.complete) {
        frameIndexRef.current = idx;
        // Use requestAnimationFrame for smooth 60fps rendering
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          try {
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            ctx!.drawImage(images[idx], 0, 0, canvas.width, canvas.height);
          } catch {
            // Silently handle draw errors
          }
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion]);

  // Determine which visual mode to render
  const showCanvas = !prefersReducedMotion && canvasReady && !canvasFailed;
  const showStaticFallback = prefersReducedMotion || canvasFailed;

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative"
      style={{ height: prefersReducedMotion ? '100vh' : '400vh' }}
      aria-label="Hero section showcasing Wefton Copper premium micro-french terry products"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Preloaded hero images using Next.js Image with priority for LCP — WebP served automatically */}
        <div className="hidden" aria-hidden="true">
          {HERO_IMAGES.map((img) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              priority
            />
          ))}
        </div>

        {/* Static image fallback for prefers-reduced-motion: reduce or canvas failure */}
        {showStaticFallback && (
          <div className="absolute inset-0">
            <Image
              src={HERO_IMAGES[0].src}
              alt={HERO_IMAGES[0].alt}
              width={HERO_IMAGES[0].width}
              height={HERO_IMAGES[0].height}
              priority
              className={`absolute inset-0 w-full h-full object-cover ${
                canvasFailed && !prefersReducedMotion
                  ? 'animate-hero-ken-burns'
                  : ''
              }`}
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}

        {/* Gradient fallback while canvas is loading (not reduced motion) */}
        {!prefersReducedMotion && !canvasReady && !canvasFailed && (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-darker)] via-[var(--bg-dark)] to-[#1a0f08]">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 50%, var(--copper-main) 0%, transparent 50%),
                                  radial-gradient(circle at 70% 30%, var(--copper-light) 0%, transparent 40%)`,
              }}
            />
          </div>
        )}

        {/* Canvas element for scroll-driven animation — 60fps via requestAnimationFrame */}
        {!prefersReducedMotion && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: showCanvas ? 'block' : 'none' }}
            aria-hidden="true"
          />
        )}

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-dark)]/40 via-transparent to-transparent" />

        {/* Hero Content — Brand tagline and CTA */}
        <motion.div
          style={prefersReducedMotion ? {} : { y: textY, opacity: textOpacity }}
          className="relative z-10 text-center px-6 max-w-4xl ml-auto mr-[10%]"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xs tracking-[6px] uppercase text-[var(--copper-light)] mb-6"
          >
            Premium Lifestyle Brand
          </motion.p>

          {/* Brand tagline: "Premium Lightweight Micro-French Terry" */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.165, 0.84, 0.44, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-[var(--text-light)] leading-none mb-6"
          >
            Premium Lightweight
            <br />
            <span className="gradient-copper copper-glow-text">Micro-French Terry</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-base md:text-lg text-[var(--text-muted)] max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Crafted for the discerning individual. Experience every thread as you scroll.
          </motion.p>

          {/* CTA buttons linking to /men and /women */}
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

        {/* Scroll indicator (hidden for reduced motion) */}
        {!prefersReducedMotion && (
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
        )}
      </div>
    </section>
  );
}
