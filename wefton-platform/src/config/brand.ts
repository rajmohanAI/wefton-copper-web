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
  { id: 'premium-tee', name: 'Premium Tee', slug: 'premium-tee', thumbnail: '/men_product_01.png' },
  { id: 'premium-polo', name: 'Premium Polo', slug: 'premium-polo', thumbnail: '/men_product_02.png' },
  { id: 'oversized-tee', name: 'Oversized Tee', slug: 'oversized-tee', thumbnail: '/men_product_03.png' },
  { id: 'full-sleeved-tee', name: 'Full Sleeved Tee', slug: 'full-sleeved-tee', thumbnail: '/men_product_04.png' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear', thumbnail: '/men_product_05.png' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts', thumbnail: '/men_product_08.png' },
  { id: 'joggers', name: 'Joggers', slug: 'joggers', thumbnail: '/men_product_06.png' },
  { id: 'cargos', name: 'Cargos', slug: 'cargos', thumbnail: '/men_product_02.png' },
  { id: 'casual-shirts', name: 'Casual Shirts', slug: 'casual-shirts', thumbnail: '/men_product_10.png' },
  { id: 'co-ords', name: 'Co-Ords', slug: 'co-ords', thumbnail: '/men_product_09.png' },
  { id: 'hoodies', name: 'Hoodies', slug: 'hoodies', thumbnail: '/men_product_09.png' },
  { id: 'sun-jackets', name: 'Sun-Jackets', slug: 'sun-jackets', thumbnail: '/men_product_07.png' },
  { id: 'shaper-vest', name: 'Shaper Vest', slug: 'shaper-vest', thumbnail: '/men_product_01.png' },
] as const;

export const WOMEN_CATEGORIES = [
  { id: 'kurtis', name: 'Kurtis', slug: 'kurtis', thumbnail: '/women_product_01.png' },
  { id: 'crop-top', name: 'Crop Top', slug: 'crop-top', thumbnail: '/women_product_02.png' },
  { id: 'smocked-top', name: 'Smocked Top', slug: 'smocked-top', thumbnail: '/women_product_01.png' },
  { id: 'halter-tops', name: 'Halter Tops', slug: 'halter-tops', thumbnail: '/women_product_02.png' },
  { id: 'sweetheart-tops', name: 'Sweetheart Tops', slug: 'sweetheart-tops', thumbnail: '/women_product_01.png' },
  { id: 'long-skirts', name: 'Long Skirts', slug: 'long-skirts', thumbnail: '/women_product_02.png' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts', thumbnail: '/women_product_01.png' },
  { id: 'denim-pants', name: 'Denim Pants', slug: 'denim-pants', thumbnail: '/women_product_02.png' },
  { id: 'leggings', name: 'Leggings', slug: 'leggings', thumbnail: '/women_product_01.png' },
  { id: 'palazzo-pants', name: 'Palazzo Pants', slug: 'palazzo-pants', thumbnail: '/women_product_02.png' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear', thumbnail: '/women_product_01.png' },
  { id: 'tee', name: 'Tee', slug: 'tee', thumbnail: '/women_product_02.png' },
  { id: 'polo', name: 'Polo', slug: 'polo', thumbnail: '/women_product_01.png' },
  { id: 'ribbed-full-sleeve', name: 'Ribbed Full Sleeve', slug: 'ribbed-full-sleeve', thumbnail: '/women_product_02.png' },
] as const;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

export const SHIPPING_COST = 99;
export const FREE_SHIPPING_THRESHOLD = 999;
export const TAX_RATE = 0.05; // 5% GST
