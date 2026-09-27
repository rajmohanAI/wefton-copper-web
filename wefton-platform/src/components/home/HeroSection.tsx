/**
 * HeroSection — Placeholder component.
 *
 * The previous canvas scroll-driven animation and all Framer Motion logic
 * have been removed as part of the V2 overhaul (Requirements 16.1, 16.2, 16.4).
 *
 * This placeholder will be replaced by the BannerSlider component in task 2.2.
 */
export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Hero banner"
      className="w-full"
    >
      {/* BannerSlider will be implemented here in task 2.2 */}
      <div className="w-full aspect-[16/7] md:aspect-[16/5] bg-[var(--color-card,#f9f9f9)] flex items-center justify-center">
        <p className="text-[var(--color-muted,#737373)] text-base md:text-lg">
          Banner Slider — Coming Soon
        </p>
      </div>
    </section>
  );
}
