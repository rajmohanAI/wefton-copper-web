// ============================================================
// Wefton Copper — Product images and colours (pure logic)
// ============================================================
// An image may be tagged with the colour it shows. Untagged images belong
// to every colour. The main image (isPrimary) is the product's thumbnail
// on cards, in search, the wishlist and the cart.
import type { Product, ProductImage, ProductVariant } from '@/types';

/** The image chosen as main, else the first one. */
export function primaryImage(product: Pick<Product, 'images'>): ProductImage | undefined {
  const images = product.images ?? [];
  return images.find((i) => i.isPrimary) ?? images[0];
}

const sameColor = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The gallery for one colour: its own images plus the untagged ones, main
 * image first. Falls back to every image when nothing matches.
 */
export function imagesForColor(images: ProductImage[], color?: string): ProductImage[] {
  const list = color ? images.filter((i) => !i.color || sameColor(i.color, color)) : images;
  const shown = list.length ? list : images;
  const mainIdx = shown.findIndex((i) => i.isPrimary);
  return mainIdx > 0 ? [shown[mainIdx], ...shown.slice(0, mainIdx), ...shown.slice(mainIdx + 1)] : shown;
}

/** Distinct colours across the variants, in first-seen order. */
export function variantColors(variants: ProductVariant[]): { color: string; colorHex?: string }[] {
  const seen: { color: string; colorHex?: string }[] = [];
  for (const v of variants ?? []) {
    if (v.color && !seen.some((c) => sameColor(c.color, v.color))) seen.push({ color: v.color, colorHex: v.colorHex });
  }
  return seen;
}

/** The variant for a colour and size; with no size, the colour's first variant. */
export function findVariant(variants: ProductVariant[], color?: string, size?: string): ProductVariant | undefined {
  return (variants ?? []).find((v) => (!color || !v.color || sameColor(v.color, color)) && (!size || v.size === size));
}

/** Colour of the main image, so the product page opens on the colour shown on the card. */
export function initialColor(product: Pick<Product, 'images' | 'variants'>): string | undefined {
  const colors = variantColors(product.variants ?? []);
  const mainColor = primaryImage(product)?.color;
  return colors.find((c) => sameColor(c.color, mainColor))?.color ?? colors[0]?.color;
}
