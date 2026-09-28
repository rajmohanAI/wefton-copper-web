'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const SAMPLE_PRODUCTS = [
  {
    title: 'Premium Navy Tee',
    slug: 'premium-navy-tee',
    description: 'Our signature Cotton Fabric tee in deep navy. Lightweight, breathable, and built to last with copper-stitched seams that reinforce every stress point.',
    shortDescription: 'Signature Cotton Fabric tee in deep navy',
    category: 'premium-tee',
    gender: 'men',
    tags: ['premium', 'navy', 'tee', 'micro-french-terry'],
    price: 1299,
    comparePrice: 1599,
    inventory: 45,
    sku: 'WC-PT-001',
    images: [
      { url: '/men_product_01.png', alt: 'Premium Navy Tee - Front', isPrimary: true },
      { url: '/men_product_02.png', alt: 'Premium Navy Tee - Back' },
    ],
    variants: [
      { variantId: 'v1', size: 'XS', color: 'Navy', colorHex: '#1B2838', inventory: 5, sku: 'WC-PT-001-XS-NV' },
      { variantId: 'v2', size: 'S', color: 'Navy', colorHex: '#1B2838', inventory: 10, sku: 'WC-PT-001-S-NV' },
      { variantId: 'v3', size: 'M', color: 'Navy', colorHex: '#1B2838', inventory: 15, sku: 'WC-PT-001-M-NV' },
      { variantId: 'v4', size: 'L', color: 'Navy', colorHex: '#1B2838', inventory: 12, sku: 'WC-PT-001-L-NV' },
      { variantId: 'v5', size: 'XL', color: 'Navy', colorHex: '#1B2838', inventory: 8, sku: 'WC-PT-001-XL-NV' },
      { variantId: 'v6', size: 'XXL', color: 'Navy', colorHex: '#1B2838', inventory: 5, sku: 'WC-PT-001-XXL-NV' },
      { variantId: 'v7', size: 'M', color: 'Charcoal', colorHex: '#36454F', inventory: 12, sku: 'WC-PT-001-M-CH' },
      { variantId: 'v8', size: 'M', color: 'Olive', colorHex: '#556B2F', inventory: 10, sku: 'WC-PT-001-M-OL' },
      { variantId: 'v9', size: 'M', color: 'Copper', colorHex: '#B87333', inventory: 8, sku: 'WC-PT-001-M-CP' },
      { variantId: 'v10', size: 'M', color: 'Off White', colorHex: '#FAF0E6', inventory: 10, sku: 'WC-PT-001-M-OW' },
    ],
    ratings: 4.5,
    reviewsCount: 12,
    featured: true,
    bestseller: true,
    newArrival: false,
  },
  {
    title: 'Oversized Black Tee',
    slug: 'oversized-black-tee',
    description: 'The perfect oversized silhouette in premium black Cotton Fabric. Drop shoulders, relaxed fit, and our signature copper-stitched collar that never loses shape.',
    shortDescription: 'Oversized fit in premium black Cotton Fabric',
    category: 'oversized-tee',
    gender: 'men',
    tags: ['oversized', 'black', 'tee', 'relaxed-fit'],
    price: 1499,
    comparePrice: 1899,
    inventory: 30,
    sku: 'WC-OT-001',
    images: [
      { url: '/men_product_03.png', alt: 'Oversized Black Tee - Front', isPrimary: true },
      { url: '/men_product_04.png', alt: 'Oversized Black Tee - Side' },
    ],
    variants: [
      { variantId: 'v5', size: 'XS', color: 'Black', colorHex: '#0A0A0A', inventory: 5, sku: 'WC-OT-001-XS-BK' },
      { variantId: 'v5a', size: 'S', color: 'Black', colorHex: '#0A0A0A', inventory: 8, sku: 'WC-OT-001-S-BK' },
      { variantId: 'v5b', size: 'M', color: 'Black', colorHex: '#0A0A0A', inventory: 10, sku: 'WC-OT-001-M-BK' },
      { variantId: 'v6', size: 'L', color: 'Black', colorHex: '#0A0A0A', inventory: 10, sku: 'WC-OT-001-L-BK' },
      { variantId: 'v6a', size: 'XL', color: 'Black', colorHex: '#0A0A0A', inventory: 6, sku: 'WC-OT-001-XL-BK' },
      { variantId: 'v6b', size: 'XXL', color: 'Black', colorHex: '#0A0A0A', inventory: 4, sku: 'WC-OT-001-XXL-BK' },
      { variantId: 'v6c', size: 'M', color: 'Ash Grey', colorHex: '#B2BEB5', inventory: 8, sku: 'WC-OT-001-M-AG' },
      { variantId: 'v6d', size: 'M', color: 'Forest Green', colorHex: '#228B22', inventory: 6, sku: 'WC-OT-001-M-FG' },
      { variantId: 'v6e', size: 'M', color: 'Rust', colorHex: '#B7410E', inventory: 7, sku: 'WC-OT-001-M-RS' },
      { variantId: 'v6f', size: 'M', color: 'Sand', colorHex: '#C2B280', inventory: 9, sku: 'WC-OT-001-M-SD' },
    ],
    ratings: 4.8,
    reviewsCount: 24,
    featured: true,
    bestseller: false,
    newArrival: true,
  },
  {
    title: 'Premium Polo - Olive',
    slug: 'premium-polo-olive',
    description: 'Elevated polo crafted from our proprietary Cotton Fabric blend. The architectural collar with copper stitching retains its shape wash after wash.',
    shortDescription: 'Elevated polo in olive Cotton Fabric',
    category: 'premium-polo',
    gender: 'men',
    tags: ['polo', 'olive', 'premium', 'collar'],
    price: 1699,
    comparePrice: 2099,
    inventory: 20,
    sku: 'WC-PP-001',
    images: [
      { url: '/men_product_05.png', alt: 'Premium Polo Olive - Front', isPrimary: true },
      { url: '/men_product_06.png', alt: 'Premium Polo Olive - Detail' },
    ],
    variants: [
      { variantId: 'v8', size: 'XS', color: 'Olive', colorHex: '#4A5D3A', inventory: 3, sku: 'WC-PP-001-XS-OL' },
      { variantId: 'v8a', size: 'S', color: 'Olive', colorHex: '#4A5D3A', inventory: 5, sku: 'WC-PP-001-S-OL' },
      { variantId: 'v9', size: 'M', color: 'Olive', colorHex: '#4A5D3A', inventory: 8, sku: 'WC-PP-001-M-OL' },
      { variantId: 'v9a', size: 'L', color: 'Olive', colorHex: '#4A5D3A', inventory: 7, sku: 'WC-PP-001-L-OL' },
      { variantId: 'v9b', size: 'XL', color: 'Olive', colorHex: '#4A5D3A', inventory: 4, sku: 'WC-PP-001-XL-OL' },
      { variantId: 'v9c', size: 'XXL', color: 'Olive', colorHex: '#4A5D3A', inventory: 3, sku: 'WC-PP-001-XXL-OL' },
      { variantId: 'v9d', size: 'M', color: 'Navy', colorHex: '#1B2838', inventory: 6, sku: 'WC-PP-001-M-NV' },
      { variantId: 'v9e', size: 'M', color: 'Burgundy', colorHex: '#800020', inventory: 5, sku: 'WC-PP-001-M-BG' },
      { variantId: 'v9f', size: 'M', color: 'White', colorHex: '#FFFFFF', inventory: 8, sku: 'WC-PP-001-M-WH' },
      { variantId: 'v9g', size: 'M', color: 'Copper', colorHex: '#B87333', inventory: 4, sku: 'WC-PP-001-M-CP' },
    ],
    ratings: 4.3,
    reviewsCount: 8,
    featured: true,
    bestseller: false,
    newArrival: true,
  },
  {
    title: 'Active Wear Tee - Charcoal',
    slug: 'active-wear-tee-charcoal',
    description: 'Engineered for movement. Our Active Wear tee combines moisture-wicking Cotton Fabric with four-way stretch for gym-to-street versatility.',
    shortDescription: 'Moisture-wicking active tee in charcoal',
    category: 'active-wear',
    gender: 'men',
    tags: ['active', 'charcoal', 'gym', 'stretch'],
    price: 1199,
    comparePrice: 1499,
    inventory: 50,
    sku: 'WC-AW-001',
    images: [
      { url: '/men_product_07.png', alt: 'Active Wear Tee Charcoal - Front', isPrimary: true },
      { url: '/men_product_08.png', alt: 'Active Wear Tee Charcoal - Back' },
    ],
    variants: [
      { variantId: 'v11', size: 'XS', color: 'Charcoal', colorHex: '#36454F', inventory: 5, sku: 'WC-AW-001-XS-CH' },
      { variantId: 'v11a', size: 'S', color: 'Charcoal', colorHex: '#36454F', inventory: 12, sku: 'WC-AW-001-S-CH' },
      { variantId: 'v12', size: 'M', color: 'Charcoal', colorHex: '#36454F', inventory: 15, sku: 'WC-AW-001-M-CH' },
      { variantId: 'v12a', size: 'L', color: 'Charcoal', colorHex: '#36454F', inventory: 10, sku: 'WC-AW-001-L-CH' },
      { variantId: 'v12b', size: 'XL', color: 'Charcoal', colorHex: '#36454F', inventory: 8, sku: 'WC-AW-001-XL-CH' },
      { variantId: 'v12c', size: 'XXL', color: 'Charcoal', colorHex: '#36454F', inventory: 5, sku: 'WC-AW-001-XXL-CH' },
      { variantId: 'v12d', size: 'M', color: 'Electric Blue', colorHex: '#0892D0', inventory: 10, sku: 'WC-AW-001-M-EB' },
      { variantId: 'v12e', size: 'M', color: 'Neon Green', colorHex: '#39FF14', inventory: 8, sku: 'WC-AW-001-M-NG' },
      { variantId: 'v12f', size: 'M', color: 'Black', colorHex: '#0A0A0A', inventory: 12, sku: 'WC-AW-001-M-BK' },
      { variantId: 'v12g', size: 'M', color: 'Red', colorHex: '#CC0000', inventory: 6, sku: 'WC-AW-001-M-RD' },
    ],
    ratings: 4.6,
    reviewsCount: 18,
    featured: false,
    bestseller: true,
    newArrival: false,
  },
  {
    title: 'Copper Hoodie - Midnight',
    slug: 'copper-hoodie-midnight',
    description: 'Premium heavyweight Cotton Fabric hoodie with kangaroo pocket and copper-stitched drawstring hood. The ultimate layering piece for cooler days.',
    shortDescription: 'Heavyweight hoodie in midnight black',
    category: 'hoodies',
    gender: 'men',
    tags: ['hoodie', 'midnight', 'heavyweight', 'winter'],
    price: 2499,
    comparePrice: 2999,
    inventory: 15,
    sku: 'WC-HD-001',
    images: [
      { url: '/men_product_09.png', alt: 'Copper Hoodie Midnight - Front', isPrimary: true },
      { url: '/men_product_10.png', alt: 'Copper Hoodie Midnight - Hood Detail' },
    ],
    variants: [
      { variantId: 'v15', size: 'XS', color: 'Midnight', colorHex: '#191970', inventory: 3, sku: 'WC-HD-001-XS-MN' },
      { variantId: 'v15a', size: 'S', color: 'Midnight', colorHex: '#191970', inventory: 4, sku: 'WC-HD-001-S-MN' },
      { variantId: 'v15b', size: 'M', color: 'Midnight', colorHex: '#191970', inventory: 5, sku: 'WC-HD-001-M-MN' },
      { variantId: 'v16', size: 'L', color: 'Midnight', colorHex: '#191970', inventory: 5, sku: 'WC-HD-001-L-MN' },
      { variantId: 'v16a', size: 'XL', color: 'Midnight', colorHex: '#191970', inventory: 3, sku: 'WC-HD-001-XL-MN' },
      { variantId: 'v16b', size: 'XXL', color: 'Midnight', colorHex: '#191970', inventory: 2, sku: 'WC-HD-001-XXL-MN' },
      { variantId: 'v16c', size: 'M', color: 'Heather Grey', colorHex: '#9E9E9E', inventory: 5, sku: 'WC-HD-001-M-HG' },
      { variantId: 'v16d', size: 'M', color: 'Black', colorHex: '#0A0A0A', inventory: 6, sku: 'WC-HD-001-M-BK' },
      { variantId: 'v16e', size: 'M', color: 'Copper Brown', colorHex: '#A0522D', inventory: 4, sku: 'WC-HD-001-M-CB' },
      { variantId: 'v16f', size: 'M', color: 'Forest Green', colorHex: '#228B22', inventory: 3, sku: 'WC-HD-001-M-FG' },
    ],
    ratings: 4.9,
    reviewsCount: 31,
    featured: true,
    bestseller: true,
    newArrival: false,
  },
  {
    title: 'Women Premium Tee - Blush',
    slug: 'women-premium-tee-blush',
    description: 'Feminine silhouette in soft blush Cotton Fabric. Slightly cropped with a relaxed shoulder for effortless everyday style.',
    shortDescription: 'Feminine premium tee in soft blush',
    category: 'premium-tee',
    gender: 'women',
    tags: ['premium', 'blush', 'tee', 'cropped'],
    price: 1299,
    comparePrice: 1599,
    inventory: 35,
    sku: 'WC-WPT-001',
    images: [
      { url: '/women_product_01.png', alt: 'Women Premium Tee Blush - Front', isPrimary: true },
      { url: '/women_product_02.png', alt: 'Women Premium Tee Blush - Side' },
    ],
    variants: [
      { variantId: 'v18', size: 'XS', color: 'Blush', colorHex: '#DE5D83', inventory: 5, sku: 'WC-WPT-001-XS-BL' },
      { variantId: 'v19', size: 'S', color: 'Blush', colorHex: '#DE5D83', inventory: 10, sku: 'WC-WPT-001-S-BL' },
      { variantId: 'v19a', size: 'M', color: 'Blush', colorHex: '#DE5D83', inventory: 12, sku: 'WC-WPT-001-M-BL' },
      { variantId: 'v19b', size: 'L', color: 'Blush', colorHex: '#DE5D83', inventory: 8, sku: 'WC-WPT-001-L-BL' },
      { variantId: 'v19c', size: 'XL', color: 'Blush', colorHex: '#DE5D83', inventory: 5, sku: 'WC-WPT-001-XL-BL' },
      { variantId: 'v19d', size: 'XXL', color: 'Blush', colorHex: '#DE5D83', inventory: 3, sku: 'WC-WPT-001-XXL-BL' },
      { variantId: 'v19e', size: 'M', color: 'Sage', colorHex: '#87AE73', inventory: 8, sku: 'WC-WPT-001-M-SG' },
      { variantId: 'v19f', size: 'M', color: 'Lavender', colorHex: '#B57EDC', inventory: 7, sku: 'WC-WPT-001-M-LV' },
      { variantId: 'v19g', size: 'M', color: 'Cloud White', colorHex: '#F5F5F5', inventory: 10, sku: 'WC-WPT-001-M-CW' },
      { variantId: 'v19h', size: 'M', color: 'Terracotta', colorHex: '#CC5533', inventory: 6, sku: 'WC-WPT-001-M-TC' },
    ],
    ratings: 4.7,
    reviewsCount: 15,
    featured: true,
    bestseller: false,
    newArrival: true,
  },
];

const SAMPLE_COUPONS = [
  { code: 'WEFTON10', discount: 10, active: true, expiresAt: null },
  { code: 'WELCOME20', discount: 20, active: true, expiresAt: null },
  { code: 'EXPIRED5', discount: 5, active: true, expiresAt: '2024-01-01T00:00:00Z' },
];

// Categories mirror the actual seeded products so the menu and homepage
// showcase stay in sync with what customers can actually buy.
const SAMPLE_CATEGORIES = [
  // Men (matches the 5 men's products above)
  { categoryId: 'cat-1', name: 'Premium Tee', slug: 'premium-tee', gender: 'men', image: '/men_product_01.png', order: 1 },
  { categoryId: 'cat-2', name: 'Premium Polo', slug: 'premium-polo', gender: 'men', image: '/men_product_02.png', order: 2 },
  { categoryId: 'cat-3', name: 'Oversized Tee', slug: 'oversized-tee', gender: 'men', image: '/men_product_03.png', order: 3 },
  { categoryId: 'cat-4', name: 'Active Wear', slug: 'active-wear', gender: 'men', image: '/men_product_05.png', order: 4 },
  { categoryId: 'cat-5', name: 'Hoodies', slug: 'hoodies', gender: 'men', image: '/men_product_09.png', order: 5 },
  // Women (matches the women's product above)
  { categoryId: 'cat-7', name: 'Premium Tee', slug: 'premium-tee', gender: 'women', image: '/women_product_01.png', order: 1 },
  { categoryId: 'cat-8', name: 'Active Wear', slug: 'active-wear', gender: 'women', image: '/women_product_02.png', order: 2 },
];

export default function SeedPage() {
  const [status, setStatus] = useState<string[]>([]);
  const [seeding, setSeeding] = useState(false);

  const log = (msg: string) => setStatus((prev) => [...prev, msg]);

  const seedProducts = async () => {
    const db = getFirebaseDb();
    if (!db) { log('❌ Firebase not configured'); return; }

    log('📦 Seeding products...');
    for (const product of SAMPLE_PRODUCTS) {
      // Check if product already exists by slug
      const existing = await getDocs(query(collection(db, 'products'), where('slug', '==', product.slug)));
      if (!existing.empty) {
        log(`⏭️ Skipped "${product.title}" (already exists)`);
        continue;
      }
      await addDoc(collection(db, 'products'), { ...product, createdAt: serverTimestamp() });
      log(`✅ Added "${product.title}"`);
    }
    log('📦 Products seeding complete!');
  };

  const seedCoupons = async () => {
    const db = getFirebaseDb();
    if (!db) { log('❌ Firebase not configured'); return; }

    log('🎟️ Seeding coupons...');
    for (const coupon of SAMPLE_COUPONS) {
      const existing = await getDocs(query(collection(db, 'coupons'), where('code', '==', coupon.code)));
      if (!existing.empty) {
        log(`⏭️ Skipped coupon "${coupon.code}" (already exists)`);
        continue;
      }
      await addDoc(collection(db, 'coupons'), coupon);
      log(`✅ Added coupon "${coupon.code}" (${coupon.discount}% off)`);
    }
    log('🎟️ Coupons seeding complete!');
  };

  const seedCategories = async () => {
    const db = getFirebaseDb();
    if (!db) { log('❌ Firebase not configured'); return; }

    log('📂 Seeding categories...');
    for (const cat of SAMPLE_CATEGORIES) {
      const existing = await getDocs(query(collection(db, 'categories'), where('slug', '==', cat.slug), where('gender', '==', cat.gender)));
      if (!existing.empty) {
        log(`⏭️ Skipped category "${cat.name}" (${cat.gender}) (already exists)`);
        continue;
      }
      await addDoc(collection(db, 'categories'), cat);
      log(`✅ Added category "${cat.name}" (${cat.gender})`);
    }
    log('📂 Categories seeding complete!');
  };

  const handleSeedAll = async () => {
    setSeeding(true);
    setStatus([]);
    log('🚀 Starting seed process...');
    try {
      await seedProducts();
      await seedCoupons();
      await seedCategories();
      log('');
      log('🎉 All done! Your Firestore is now populated with sample data.');
      log('👉 Visit /men or /women to see products.');
      log('👉 Use coupon code WEFTON10 for 10% off.');
    } catch (error) {
      log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-light text-[var(--copper-light)] mb-2">Seed Database</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Populate Firestore with sample products, coupons, and categories for testing.
        </p>

        <div className="flex gap-4 mb-8">
          <button
            onClick={handleSeedAll}
            disabled={seeding}
            className="px-6 py-3 bg-[var(--copper-main)] text-white rounded text-sm font-medium hover:bg-[var(--copper-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seeding ? 'Seeding...' : 'Seed All Data'}
          </button>
          <button
            onClick={() => setStatus([])}
            className="px-6 py-3 bg-white/5 border border-white/10 text-[var(--text-muted)] rounded text-sm hover:text-[var(--text-light)] transition-colors"
          >
            Clear Log
          </button>
        </div>

        {/* Status Log */}
        {status.length > 0 && (
          <div className="bg-black/30 border border-white/10 rounded-lg p-4 font-mono text-xs space-y-1 max-h-[60vh] overflow-y-auto">
            {status.map((msg, i) => (
              <p key={i} className={msg.startsWith('❌') ? 'text-red-400' : msg.startsWith('✅') ? 'text-emerald-400' : msg.startsWith('⏭️') ? 'text-amber-400' : 'text-[var(--text-muted)]'}>
                {msg}
              </p>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
          <strong>Note:</strong> This page is for development only. Remove it before deploying to production, or protect it behind admin auth.
        </div>
      </div>
    </div>
  );
}
