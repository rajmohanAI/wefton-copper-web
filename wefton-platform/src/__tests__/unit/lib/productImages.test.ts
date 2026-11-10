// ============================================================
// Wefton Copper — Product images and colours
// ============================================================
import { describe, expect, it } from 'vitest';
import { findVariant, imagesForColor, initialColor, primaryImage, variantColors } from '@/lib/productImages';
import type { ProductImage, ProductVariant } from '@/types';

const img = (url: string, extra: Partial<ProductImage> = {}): ProductImage => ({ url, alt: url, ...extra });
const variant = (color: string, size: string, inventory = 5): ProductVariant => ({
  variantId: `${color}-${size}`,
  color,
  colorHex: color === 'Olive Green' ? '#556B2F' : '#1F3A68',
  size,
  inventory,
});
const variants = ['Olive Green', 'Deep Blue'].flatMap((c) => ['M', 'L', 'XL'].map((s) => variant(c, s, c === 'Deep Blue' && s === 'L' ? 0 : 5)));

describe('product images and colours', () => {
  it('lists each colour once', () => {
    expect(variantColors(variants)).toEqual([
      { color: 'Olive Green', colorHex: '#556B2F' },
      { color: 'Deep Blue', colorHex: '#1F3A68' },
    ]);
  });

  it('finds the variant for a colour and size', () => {
    expect(findVariant(variants, 'Deep Blue', 'L')).toMatchObject({ variantId: 'Deep Blue-L', inventory: 0 });
    expect(findVariant(variants, 'deep blue')).toMatchObject({ variantId: 'Deep Blue-M' });
    expect(findVariant(variants, 'Pink', 'M')).toBeUndefined();
  });

  it('uses the image marked main, else the first', () => {
    expect(primaryImage({ images: [img('a'), img('b', { isPrimary: true })] })?.url).toBe('b');
    expect(primaryImage({ images: [img('a'), img('b')] })?.url).toBe('a');
    expect(primaryImage({ images: [] })).toBeUndefined();
  });

  it('shows a colour its own images plus untagged ones, main first', () => {
    const images = [
      img('green-1', { color: 'Olive Green' }),
      img('blue-1', { color: 'Deep Blue' }),
      img('any'),
      img('blue-2', { color: 'Deep Blue', isPrimary: true }),
    ];
    expect(imagesForColor(images, 'Deep Blue').map((i) => i.url)).toEqual(['blue-2', 'blue-1', 'any']);
    expect(imagesForColor(images, 'Olive Green').map((i) => i.url)).toEqual(['green-1', 'any']);
    // No images for the colour: show everything rather than nothing.
    expect(imagesForColor([img('green-1', { color: 'Olive Green' })], 'Deep Blue').map((i) => i.url)).toEqual(['green-1']);
  });

  it('opens on the colour of the main image', () => {
    expect(initialColor({ variants, images: [img('x', { color: 'Deep Blue', isPrimary: true })] })).toBe('Deep Blue');
    expect(initialColor({ variants, images: [img('x')] })).toBe('Olive Green');
    expect(initialColor({ variants: [], images: [] })).toBeUndefined();
  });
});
