// ============================================================
// Wefton Copper — Brand Configuration
// ============================================================

export const BRAND = {
  name: 'Wefton Copper',
  tagline: 'Premium Lightweight Cotton Fabric',
  description:
    'Redefining the global standard for essential wear, starting from the thread up.',
  email: 'sales@weftoncopper.com',
  phone: '+91 80561 35201',
  address: 'Chennai, Tamil Nadu, India',
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

// `thumbnail` is intentionally empty: the old PNG fallbacks were 2–7 MB
// each. Category images come from Firestore; empty means "show a
// placeholder" (V2 spec, Req 7.9).
export const MEN_CATEGORIES = [
  { id: 'premium-tee', name: 'Premium Tee', slug: 'premium-tee', thumbnail: '' },
  { id: 'premium-polo', name: 'Premium Polo', slug: 'premium-polo', thumbnail: '' },
  { id: 'oversized-tee', name: 'Oversized Tee', slug: 'oversized-tee', thumbnail: '' },
  { id: 'full-sleeved-tee', name: 'Full Sleeved Tee', slug: 'full-sleeved-tee', thumbnail: '' },
  { id: 'active-wear', name: 'Active Wear', slug: 'active-wear', thumbnail: '' },
  { id: 'shorts', name: 'Shorts', slug: 'shorts', thumbnail: '' },
  { id: 'joggers', name: 'Joggers', slug: 'joggers', thumbnail: '' },
  { id: 'cargos', name: 'Cargos', slug: 'cargos', thumbnail: '' },
  { id: 'casual-shirts', name: 'Casual Shirts', slug: 'casual-shirts', thumbnail: '' },
  { id: 'co-ords', name: 'Co-Ords', slug: 'co-ords', thumbnail: '' },
  { id: 'hoodies', name: 'Hoodies', slug: 'hoodies', thumbnail: '' },
  { id: 'sun-jackets', name: 'Sun-Jackets', slug: 'sun-jackets', thumbnail: '' },
  { id: 'shaper-vest', name: 'Shaper Vest', slug: 'shaper-vest', thumbnail: '' },
] as const;

export const WOMEN_CATEGORIES = [
  { id: 'premium-tee', name: 'Premium Tee', slug: 'premium-tee', thumbnail: '' },
  { id: 'active-wear', name: 'Active Wear Tshirt', slug: 'active-wear', thumbnail: '' },
] as const;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;

export const SHIPPING_COST = 99;
export const FREE_SHIPPING_THRESHOLD = 999;
export const TAX_RATE = 0.05; // 5% GST
