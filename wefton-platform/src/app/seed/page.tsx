'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const SAMPLE_PRODUCTS = [
  {
    title: 'Premium Navy Tee',
    slug: 'premium-navy-tee',
    description: 'Our signature Micro-French Terry tee in deep navy. Lightweight, breathable, and built to last with copper-stitched seams that reinforce every stress point.',
    shortDescription: 'Signature Micro-French Terry tee in deep navy',
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
      { variantId: 'v1', size: 'S', color: 'Navy', colorHex: '#1B2838', inventory: 10, sku: 'WC-PT-001-S' },
      { variantId: 'v2', size: 'M', color: 'Navy', colorHex: '#1B2838', inventory: 15, sku: 'WC-PT-001-M' },
      { variantId: 'v3', size: 'L', color: 'Navy', colorHex: '#1B2838', inventory: 12, sku: 'WC-PT-001-L' },
      { variantId: 'v4', size: 'XL', color: 'Navy', colorHex: '#1B2838', inventory: 8, sku: 'WC-PT-001-XL' },
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
    description: 'The perfect oversized silhouette in premium black Micro-French Terry. Drop shoulders, relaxed fit, and our signature copper-stitched collar that never loses shape.',
    shortDescription: 'Oversized fit in premium black Micro-French Terry',
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
      { variantId: 'v5', size: 'M', color: 'Black', colorHex: '#0A0A0A', inventory: 10, sku: 'WC-OT-001-M' },
      { variantId: 'v6', size: 'L', color: 'Black', colorHex: '#0A0A0A', inventory: 10, sku: 'WC-OT-001-L' },
      { variantId: 'v7', size: 'XL', color: 'Black', colorHex: '#0A0A0A', inventory: 10, sku: 'WC-OT-001-XL' },
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
    description: 'Elevated polo crafted from our proprietary Micro-French Terry blend. The architectural collar with copper stitching retains its shape wash after wash.',
    shortDescription: 'Elevated polo in olive Micro-French Terry',
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
      { variantId: 'v8', size: 'S', color: 'Olive', colorHex: '#4A5D3A', inventory: 5, sku: 'WC-PP-001-S' },
      { variantId: 'v9', size: 'M', color: 'Olive', colorHex: '#4A5D3A', inventory: 8, sku: 'WC-PP-001-M' },
      { variantId: 'v10', size: 'L', color: 'Olive', colorHex: '#4A5D3A', inventory: 7, sku: 'WC-PP-001-L' },
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
    description: 'Engineered for movement. Our Active Wear tee combines moisture-wicking Micro-French Terry with four-way stretch for gym-to-street versatility.',
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
      { variantId: 'v11', size: 'S', color: 'Charcoal', colorHex: '#36454F', inventory: 12, sku: 'WC-AW-001-S' },
      { variantId: 'v12', size: 'M', color: 'Charcoal', colorHex: '#36454F', inventory: 15, sku: 'WC-AW-001-M' },
      { variantId: 'v13', size: 'L', color: 'Charcoal', colorHex: '#36454F', inventory: 13, sku: 'WC-AW-001-L' },
      { variantId: 'v14', size: 'XL', color: 'Charcoal', colorHex: '#36454F', inventory: 10, sku: 'WC-AW-001-XL' },
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
    description: 'Premium heavyweight Micro-French Terry hoodie with kangaroo pocket and copper-stitched drawstring hood. The ultimate layering piece for cooler days.',
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
      { variantId: 'v15', size: 'M', color: 'Midnight', colorHex: '#191970', inventory: 5, sku: 'WC-HD-001-M' },
      { variantId: 'v16', size: 'L', color: 'Midnight', colorHex: '#191970', inventory: 5, sku: 'WC-HD-001-L' },
      { variantId: 'v17', size: 'XL', color: 'Midnight', colorHex: '#191970', inventory: 5, sku: 'WC-HD-001-XL' },
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
    description: 'Feminine silhouette in soft blush Micro-French Terry. Slightly cropped with a relaxed shoulder for effortless everyday style.',
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
      { variantId: 'v18', size: 'XS', color: 'Blush', colorHex: '#DE5D83', inventory: 8, sku: 'WC-WPT-001-XS' },
      { variantId: 'v19', size: 'S', color: 'Blush', colorHex: '#DE5D83', inventory: 10, sku: 'WC-WPT-001-S' },
      { variantId: 'v20', size: 'M', color: 'Blush', colorHex: '#DE5D83', inventory: 10, sku: 'WC-WPT-001-M' },
      { variantId: 'v21', size: 'L', color: 'Blush', colorHex: '#DE5D83', inventory: 7, sku: 'WC-WPT-001-L' },
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

const SAMPLE_CATEGORIES = [
  { categoryId: 'cat-1', name: 'Premium Tee', slug: 'premium-tee', gender: 'men', order: 1 },
  { categoryId: 'cat-2', name: 'Premium Polo', slug: 'premium-polo', gender: 'men', order: 2 },
  { categoryId: 'cat-3', name: 'Oversized Tee', slug: 'oversized-tee', gender: 'men', order: 3 },
  { categoryId: 'cat-4', name: 'Active Wear', slug: 'active-wear', gender: 'men', order: 4 },
  { categoryId: 'cat-5', name: 'Hoodies', slug: 'hoodies', gender: 'men', order: 5 },
  { categoryId: 'cat-6', name: 'Joggers', slug: 'joggers', gender: 'men', order: 6 },
  { categoryId: 'cat-7', name: 'Premium Tee', slug: 'premium-tee', gender: 'women', order: 1 },
  { categoryId: 'cat-8', name: 'Co-Ords', slug: 'co-ords', gender: 'women', order: 2 },
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
