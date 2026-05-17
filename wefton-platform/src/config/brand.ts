// ============================================================
// Wefton Copper — Brand Configuration
// ============================================================

export const BRAND = {
  name: 'Wefton Copper',
  tagline: 'Premium Lightweight Micro-French Terry',
  description:
    'Redefining the global standard for essential wear, starting from the thread up.',
  email: 'hello@weftoncopper.com',
  phone: '+91 98765 43210',
  address: 'India',
  social: {
    instagram: 'https://instagram.com/weftoncopper',
    facebook: 'https://facebook.com/weftoncopper',
    twitter: 'https://twitter.com/weftoncopper',
  },
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },
} as const;

export const MEN_CATEGORIES = [
  { id: 'premium-tee', name: 'Premium Tee', slug: 'premium-tee' },
  { id: 'premium-polo', name: 'Premium Polo', slug: 'premium-polo' },
  { id: 'oversized-tee', name: 'Oversized Tee', slug: 'oversized-tee' },
  { id: 'full-sleeved-tee', name: 'Full Sleeved Tee', slug: 'full-sleeved-tee' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts' },
  { id: 'joggers', name: 'Joggers', slug: 'joggers' },
  { id: 'cargos', name: 'Cargos', slug: 'cargos' },
  { id: 'casual-shirts', name: 'Casual Shirts', slug: 'casual-shirts' },
  { id: 'co-ords', name: 'Co-Ords', slug: 'co-ords' },
  { id: 'hoodies', name: 'Hoodies', slug: 'hoodies' },
  { id: 'sun-jackets', name: 'Sun-Jackets', slug: 'sun-jackets' },
  { id: 'shaper-vest', name: 'Shaper Vest', slug: 'shaper-vest' },
] as const;

export const WOMEN_CATEGORIES = [
  { id: 'kurtis', name: 'Kurtis', slug: 'kurtis' },
  { id: 'crop-top', name: 'Crop Top', slug: 'crop-top' },
  { id: 'smocked-top', name: 'Smocked Top', slug: 'smocked-top' },
  { id: 'halter-tops', name: 'Halter Tops', slug: 'halter-tops' },
  { id: 'sweetheart-tops', name: 'Sweetheart Tops', slug: 'sweetheart-tops' },
  { id: 'long-skirts', name: 'Long Skirts', slug: 'long-skirts' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts' },
  { id: 'denim-pants', name: 'Denim Pants', slug: 'denim-pants' },
  { id: 'leggings', name: 'Leggings', slug: 'leggings' },
  { id: 'palazzo-pants', name: 'Palazzo Pants', slug: 'palazzo-pants' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear' },
  { id: 'tee', name: 'Tee', slug: 'tee' },
  { id: 'polo', name: 'Polo', slug: 'polo' },
  { id: 'ribbed-full-sleeve', name: 'Ribbed Full Sleeve', slug: 'ribbed-full-sleeve' },
] as const;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

export const SHIPPING_COST = 99;
export const FREE_SHIPPING_THRESHOLD = 999;
export const TAX_RATE = 0.05; // 5% GST
