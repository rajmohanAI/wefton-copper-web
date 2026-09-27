import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wash Care Instructions',
  description: 'How to care for your Wefton Copper Cotton Fabric garments to maintain quality and longevity.',
};

export default function WashCarePage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Wash Care Instructions</h1>
        <p className="text-[var(--text-muted)] mb-12">
          Follow these guidelines to keep your Wefton Copper garments looking and feeling their best for years.
        </p>

        <div className="space-y-10">
          {/* Machine Wash */}
          <section>
            <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">Machine Wash</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Turn the garment inside out before washing to protect the outer surface and copper stitching.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Use cold water (30°C / 86°F or below) on a gentle or delicate cycle.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Wash with similar colours to prevent colour transfer.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Use a mild liquid detergent. Avoid bleach or harsh chemicals.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Do not overload the washing machine — give garments room to move freely.
              </li>
            </ul>
          </section>

          {/* Hand Wash */}
          <section>
            <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">Hand Wash (Recommended)</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Soak in cold water with mild detergent for 10–15 minutes.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Gently agitate — do not wring, twist, or scrub the fabric.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Rinse thoroughly in cold water until detergent is fully removed.
              </li>
            </ul>
          </section>

          {/* Drying */}
          <section>
            <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">Drying</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Lay flat or hang to dry in shade. Avoid direct sunlight to prevent fading.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Do not tumble dry — high heat can shrink Cotton Fabric and damage fibres.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Reshape the garment while damp to maintain its original silhouette.
              </li>
            </ul>
          </section>

          {/* Ironing */}
          <section>
            <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">Ironing</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Iron inside out on low to medium heat (150°C / 300°F max).
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Use a pressing cloth over the copper-stitched areas to avoid direct iron contact.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Steam ironing is preferred for a wrinkle-free finish without fabric stress.
              </li>
            </ul>
          </section>

          {/* Storage */}
          <section>
            <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">Storage</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Fold neatly or use the complimentary collapsible hanger provided with your order.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Store in a cool, dry place away from direct sunlight.
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--copper-light)]">•</span>
                Keep away from rough surfaces that may snag the Cotton Fabric weave.
              </li>
            </ul>
          </section>

          {/* What to Avoid */}
          <section>
            <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">What to Avoid</h2>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
              <li className="flex gap-3">
                <span className="text-red-400">✕</span>
                Bleach or chlorine-based detergents
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">✕</span>
                Hot water wash (above 40°C)
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">✕</span>
                Tumble drying on high heat
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">✕</span>
                Dry cleaning (chemicals may affect the fabric and copper threading)
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">✕</span>
                Wringing or twisting the garment
              </li>
            </ul>
          </section>

          {/* Note */}
          <section className="glass-card p-6 border border-[var(--copper-main)]/20">
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              <span className="text-[var(--copper-light)] font-medium">Pro tip:</span> Following these wash care instructions will help your Wefton Copper garment retain its shape, colour, and the integrity of the signature copper stitching for 100+ washes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
