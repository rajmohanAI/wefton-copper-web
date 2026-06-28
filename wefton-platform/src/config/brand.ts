// ============================================================
// Wefton Copper — Brand Configuration
// ============================================================

export const BRAND = {
  name: 'Wefton Copper',
  tagline: 'Premium Lightweight Micro-French Terry',
  description:
    'Redefining the global standard for essential wear, starting from the thread up.',
  email: 'weftoncopper@gmail.com',
  phone: '+91 80561 35201',
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
  { id: 'premium-tee', name: 'Premium Tee', slug: 'premium-tee', thumbnail: '/thumbnails/men-premium-tee.jpg' },
  { id: 'premium-polo', name: 'Premium Polo', slug: 'premium-polo', thumbnail: '/thumbnails/men-premium-polo.jpg' },
  { id: 'oversized-tee', name: 'Oversized Tee', slug: 'oversized-tee', thumbnail: '/thumbnails/men-oversized-tee.jpg' },
  { id: 'full-sleeved-tee', name: 'Full Sleeved Tee', slug: 'full-sleeved-tee', thumbnail: '/thumbnails/men-full-sleeved-tee.jpg' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear', thumbnail: '/thumbnails/men-active-wear.jpg' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts', thumbnail: '/thumbnails/men-shorts.jpg' },
  { id: 'joggers', name: 'Joggers', slug: 'joggers', thumbnail: '/thumbnails/men-joggers.jpg' },
  { id: 'cargos', name: 'Cargos', slug: 'cargos', thumbnail: '/thumbnails/men-cargos.jpg' },
  { id: 'casual-shirts', name: 'Casual Shirts', slug: 'casual-shirts', thumbnail: '/thumbnails/men-casual-shirts.jpg' },
  { id: 'co-ords', name: 'Co-Ords', slug: 'co-ords', thumbnail: '/thumbnails/men-co-ords.jpg' },
  { id: 'hoodies', name: 'Hoodies', slug: 'hoodies', thumbnail: '/thumbnails/men-hoodies.jpg' },
  { id: 'sun-jackets', name: 'Sun-Jackets', slug: 'sun-jackets', thumbnail: '/thumbnails/men-sun-jackets.jpg' },
  { id: 'shaper-vest', name: 'Shaper Vest', slug: 'shaper-vest', thumbnail: '/thumbnails/men-shaper-vest.jpg' },
] as const;

export const WOMEN_CATEGORIES = [
  { id: 'kurtis', name: 'Kurtis', slug: 'kurtis', thumbnail: '/thumbnails/women-kurtis.jpg' },
  { id: 'crop-top', name: 'Crop Top', slug: 'crop-top', thumbnail: '/thumbnails/women-crop-top.jpg' },
  { id: 'smocked-top', name: 'Smocked Top', slug: 'smocked-top', thumbnail: '/thumbnails/women-smocked-top.jpg' },
  { id: 'halter-tops', name: 'Halter Tops', slug: 'halter-tops', thumbnail: '/thumbnails/women-halter-tops.jpg' },
  { id: 'sweetheart-tops', name: 'Sweetheart Tops', slug: 'sweetheart-tops', thumbnail: '/thumbnails/women-sweetheart-tops.jpg' },
  { id: 'long-skirts', name: 'Long Skirts', slug: 'long-skirts', thumbnail: '/thumbnails/women-long-skirts.jpg' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts', thumbnail: '/thumbnails/women-shorts.jpg' },
  { id: 'denim-pants', name: 'Denim Pants', slug: 'denim-pants', thumbnail: '/thumbnails/women-denim-pants.jpg' },
  { id: 'leggings', name: 'Leggings', slug: 'leggings', thumbnail: '/thumbnails/women-leggings.jpg' },
  { id: 'palazzo-pants', name: 'Palazzo Pants', slug: 'palazzo-pants', thumbnail: '/thumbnails/women-palazzo-pants.jpg' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear', thumbnail: '/thumbnails/women-active-wear.jpg' },
  { id: 'tee', name: 'Tee', slug: 'tee', thumbnail: '/thumbnails/women-tee.jpg' },
  { id: 'polo', name: 'Polo', slug: 'polo', thumbnail: '/thumbnails/women-polo.jpg' },
  { id: 'ribbed-full-sleeve', name: 'Ribbed Full Sleeve', slug: 'ribbed-full-sleeve', thumbnail: '/thumbnails/women-ribbed-full-sleeve.jpg' },
] as const;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

export const SHIPPING_COST = 99;
export const FREE_SHIPPING_THRESHOLD = 999;
export const TAX_RATE = 0.05; // 5% GST
