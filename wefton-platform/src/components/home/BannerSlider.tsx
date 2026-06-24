'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

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
            Premium Micro-French Terry Essentials
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
        className="w-full aspect-[16/7] md:aspect-[16/5]"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full">
              <Image
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fill
                className="object-cover"
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-3xl md:text-5xl font-bold text-white">
                  {slide.headline}
                </h2>
                <p className="text-base md:text-lg text-white/90 mt-2">
                  {slide.subheading}
                </p>
                <a
                  href={slide.ctaHref}
                  className="mt-6 px-8 py-3 bg-white text-black font-medium rounded hover:bg-white/90 transition-colors"
                >
                  {slide.ctaText}
                </a>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
