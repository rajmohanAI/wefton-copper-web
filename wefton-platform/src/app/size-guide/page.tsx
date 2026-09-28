import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Size Guide',
  description: 'Find your perfect fit with the Wefton Copper size guide. Measurements for all garments from XS to XXL.',
};

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-light text-[var(--copper-light)] mb-4">Size Guide</h1>
        <p className="text-sm text-[var(--text-muted)] mb-12">Find your perfect fit. All measurements are in centimetres.</p>

        {/* Men's Sizes */}
        <section className="mb-12">
          <h2 className="text-xl font-medium text-[var(--text-light)] mb-6">Men&apos;s Sizing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[var(--text-muted)] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left py-3 pr-4 text-[var(--text-light)] font-medium">Size</th>
                  <th className="text-center py-3 px-4">Chest (cm)</th>
                  <th className="text-center py-3 px-4">Waist (cm)</th>
                  <th className="text-center py-3 px-4">Length (cm)</th>
                  <th className="text-center py-3 px-4">Shoulder (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['XS', '86–91', '71–76', '66', '42'],
                  ['S', '91–97', '76–81', '68', '44'],
                  ['M', '97–102', '81–86', '70', '46'],
                  ['L', '102–107', '86–91', '72', '48'],
                  ['XL', '107–112', '91–97', '74', '50'],
                  ['XXL', '112–117', '97–102', '76', '52'],
                ].map(([size, chest, waist, length, shoulder]) => (
                  <tr key={size} className="border-b border-[var(--border-subtle)]">
                    <td className="py-3 pr-4 font-medium text-[var(--copper-light)]">{size}</td>
                    <td className="py-3 px-4 text-center">{chest}</td>
                    <td className="py-3 px-4 text-center">{waist}</td>
                    <td className="py-3 px-4 text-center">{length}</td>
                    <td className="py-3 px-4 text-center">{shoulder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Women's Sizes */}
        <section className="mb-12">
          <h2 className="text-xl font-medium text-[var(--text-light)] mb-6">Women&apos;s Sizing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-[var(--text-muted)] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left py-3 pr-4 text-[var(--text-light)] font-medium">Size</th>
                  <th className="text-center py-3 px-4">Bust (cm)</th>
                  <th className="text-center py-3 px-4">Waist (cm)</th>
                  <th className="text-center py-3 px-4">Hip (cm)</th>
                  <th className="text-center py-3 px-4">Length (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['XS', '78–83', '60–65', '86–91', '60'],
                  ['S', '83–88', '65–70', '91–96', '62'],
                  ['M', '88–93', '70–75', '96–101', '64'],
                  ['L', '93–98', '75–80', '101–106', '66'],
                  ['XL', '98–103', '80–85', '106–111', '68'],
                  ['XXL', '103–108', '85–90', '111–116', '70'],
                ].map(([size, bust, waist, hip, length]) => (
                  <tr key={size} className="border-b border-[var(--border-subtle)]">
                    <td className="py-3 pr-4 font-medium text-[var(--copper-light)]">{size}</td>
                    <td className="py-3 px-4 text-center">{bust}</td>
                    <td className="py-3 px-4 text-center">{waist}</td>
                    <td className="py-3 px-4 text-center">{hip}</td>
                    <td className="py-3 px-4 text-center">{length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium text-[var(--text-light)] mb-4">How to Measure</h2>
          <ul className="space-y-2 text-sm text-[var(--text-muted)] list-disc list-inside">
            <li><strong>Chest/Bust:</strong> Measure around the fullest part of your chest, keeping the tape level.</li>
            <li><strong>Waist:</strong> Measure around your natural waistline, keeping the tape comfortably loose.</li>
            <li><strong>Hip:</strong> Measure around the widest part of your hips.</li>
            <li><strong>Length:</strong> Measure from the highest point of the shoulder to the hem.</li>
            <li><strong>Shoulder:</strong> Measure from one shoulder seam to the other across the back.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
