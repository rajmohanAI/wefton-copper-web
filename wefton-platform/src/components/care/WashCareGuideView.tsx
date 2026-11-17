import type { WashCareGuide } from '@/config/washCare';

/** Renders one wash care guide (WC-Issue-11). */
export default function WashCareGuideView({ guide }: { guide: WashCareGuide }) {
  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs tracking-widest uppercase text-[var(--text-faint)] mb-2">
          {guide.name} · {guide.fabric}
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Care at a glance">
          {guide.quickCare.map((item) => (
            <li
              key={item}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--copper-main)]/30 text-[var(--text-light)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {guide.sections.map((section) => (
        <section key={section.title}>
          <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">{section.title}</h2>
          <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
            {section.items.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-[var(--copper-light)]" aria-hidden>
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {guide.avoid.length > 0 && (
        <section>
          <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">What to Avoid</h2>
          <ul className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
            {guide.avoid.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-red-400" aria-hidden>
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide.note && (
        <section className="glass-card p-6 border border-[var(--copper-main)]/20">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{guide.note}</p>
        </section>
      )}
    </div>
  );
}
