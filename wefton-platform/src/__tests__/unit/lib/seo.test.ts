import { describe, it, expect } from 'vitest';
import { withCanonical } from '@/lib/seo';

describe('withCanonical', () => {
  it('sets the canonical and og:url to the page path', () => {
    const meta = withCanonical('/men', { title: "Men's Collection", description: 'Shop men.' });
    expect(meta.alternates?.canonical).toBe('/men');
    expect(meta.openGraph?.url).toBe('/men');
  });

  it('fills og title, description and image when the page gives none', () => {
    const meta = withCanonical('/contact', { title: 'Contact Us', description: 'Get in touch.' });
    expect(meta.openGraph?.title).toBe('Contact Us | Wefton Copper');
    expect(meta.openGraph?.description).toBe('Get in touch.');
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: '/og-image.jpg' })]);
  });

  it("keeps the page's own openGraph values but always uses the path as og:url", () => {
    const meta = withCanonical('/about', {
      title: 'About',
      openGraph: { title: 'Our story', url: 'https://example.com/old' },
    });
    expect(meta.openGraph?.title).toBe('Our story');
    expect(meta.openGraph?.url).toBe('/about');
  });
});
