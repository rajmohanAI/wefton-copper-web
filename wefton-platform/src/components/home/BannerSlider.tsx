'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Image from 'next/image';
import bannerLoader from '@/lib/bannerLoader';

// Swiper CSS is imported (layered) in src/styles/globals.css

export interface BannerSlide {
  id: string;
  headline: string;
  subheading: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
}

interface BannerSliderProps {
  slides: BannerSlide[]; // 2–6 slides
}

const MIN_SLIDES = 2;
const MAX_SLIDES = 6;

/**
 * BannerSlider — Swiper-powered hero banner component.
 *
 * Displays 2–6 promotional slides with autoplay, pagination dots,
 * and navigation arrows. Falls back to a static banner when slide
 * count is outside the valid range.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
export default function BannerSlider({ slides }: BannerSliderProps) {
  // Validate slide count — render fallback for invalid count
  if (!slides || slides.length < MIN_SLIDES || slides.length > MAX_SLIDES) {
    return (
      <section
        aria-label="Promotional banner"
        className="w-full aspect-[16/7] md:aspect-[16/5] bg-[var(--color-card,#f9f9f9)] flex items-center justify-center"
      >
        <div className="text-center px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--color-foreground,#0a0a0a)]">
            Wefton Copper
          </h2>
          <p className="text-base md:text-lg text-[var(--color-muted,#737373)] mt-2">
            Premium Essential Wear
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Promotional banner slider" className="w-full">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
        pagination={{ clickable: true }}
        navigation
        loop
        // Banners are 32:9; matching that ratio shows the whole image, uncropped.
        className="w-full aspect-[32/9]"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full">
              <Image
                loader={bannerLoader}
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fill
                className="object-cover"
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes="100vw"
              />
              {/* Text overlay: only rendered when a slide has a headline or
                  subheading, so photo-only banners are not darkened. */}
              {(slide.headline || slide.subheading) && (
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-4">
                  {/* Only render text that exists: an empty <h2> is flagged by SEO checks. */}
                  {slide.headline && (
                    <h2 className="text-3xl md:text-5xl font-bold text-white">
                      {slide.headline}
                    </h2>
                  )}
                  {slide.subheading && (
                    <p className="text-base md:text-lg text-white/90 mt-2">
                      {slide.subheading}
                    </p>
                  )}
                </div>
              )}
              {/* Shop Now: bottom-left, clear of the models, who stand
                  centre / centre-right in every banner (WC-Issue-33).
                  On phones it sits right of the prev arrow. */}
              {slide.ctaText && (
                <a
                  href={slide.ctaHref}
                  className="absolute left-[14%] bottom-[8%] z-10 inline-flex items-center rounded-sm bg-[#8c4a22] px-2.5 py-1 text-[10px] sm:left-[5%] sm:bottom-[12%] font-semibold uppercase tracking-[0.15em] text-white shadow-lg transition-colors hover:bg-[#7a3d18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5 sm:py-2.5 sm:text-sm md:px-8 md:py-3 md:text-base"
                >
                  {slide.ctaText}
                </a>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
