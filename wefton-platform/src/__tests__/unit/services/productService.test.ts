// ============================================================
// Wefton Copper — Product Service Unit Tests
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  doc: vi.fn(() => 'mock-doc-ref'),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-product-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn(() => 'mock-query'),
  where: vi.fn(() => 'mock-where'),
  orderBy: vi.fn(() => 'mock-orderBy'),
  limit: vi.fn(() => 'mock-limit'),
  startAfter: vi.fn(() => 'mock-startAfter'),
  serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
}));

// Mock firebase lazy getter
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn(() => 'mock-db'),
}));

import { getDocs, getDoc } from 'firebase/firestore';
import {
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  getProductsByGender,
  getSimilarProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/services/productService';

const mockGetDocs = vi.mocked(getDocs);
const mockGetDoc = vi.mocked(getDoc);

// Helper to create a mock product document
function mockProductDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    exists: () => true,
  };
}

const sampleProduct = {
  title: 'Premium Navy Tee',
  slug: 'premium-navy-tee',
  description: 'A premium micro-french terry tee',
  shortDescription: 'Premium tee',
  category: 'tees',
  gender: 'men' as const,
  tags: ['premium', 'navy', 'tee'],
  price: 1299,
  comparePrice: 1599,
  inventory: 50,
  sku: 'WC-TEE-001',
  images: [{ url: '/img.webp', alt: 'Navy Tee', isPrimary: true }],
  variants: [],
  ratings: 4.5,
  reviewsCount: 12,
  featured: true,
  bestseller: false,
  newArrival: true,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProductBySlug', () => {
    it('should return a product when slug matches', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [mockProductDoc('prod-1', sampleProduct)],
      } as any);

      const result = await getProductBySlug('premium-navy-tee');

      expect(result).not.toBeNull();
      expect(result!.productId).toBe('prod-1');
      expect(result!.title).toBe('Premium Navy Tee');
      expect(result!.slug).toBe('premium-navy-tee');
    });

    it('should return null when no product matches the slug', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await getProductBySlug('non-existent-slug');

      expect(result).toBeNull();
    });

    it('should throw when Firebase is not configured', async () => {
      const { getFirebaseDb } = await import('@/lib/firebase');
      vi.mocked(getFirebaseDb).mockReturnValueOnce(null);

      await expect(getProductBySlug('any-slug')).rejects.toThrow('Firebase not configured');
    });
  });

  describe('getProductById', () => {
    it('should return a product when id exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'prod-1',
        data: () => sampleProduct,
      } as any);

      const result = await getProductById('prod-1');

      expect(result).not.toBeNull();
      expect(result!.productId).toBe('prod-1');
      expect(result!.title).toBe('Premium Navy Tee');
    });

    it('should return null when id does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        id: 'non-existent',
        data: () => undefined,
      } as any);

      const result = await getProductById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getFeaturedProducts', () => {
    it('should return featured products ordered by createdAt desc', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, featured: true }),
        mockProductDoc('prod-2', { ...sampleProduct, title: 'Another Tee', featured: true }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getFeaturedProducts();

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('prod-1');
      expect(result[1].productId).toBe('prod-2');
    });

    it('should return empty array when no featured products exist', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await getFeaturedProducts();

      expect(result).toEqual([]);
    });

    it('should respect the count parameter', async () => {
      const products = [mockProductDoc('prod-1', sampleProduct)];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getFeaturedProducts(4);

      expect(result).toHaveLength(1);
    });
  });

  describe('getProductsByGender', () => {
    it('should return products filtered by gender', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, gender: 'men', price: 1299, ratings: 4.5 }),
        mockProductDoc('prod-2', { ...sampleProduct, gender: 'men', price: 999, ratings: 3.8 }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getProductsByGender('men');

      expect(result.products).toHaveLength(2);
      expect(result.products[0].productId).toBe('prod-1');
    });

    it('should apply price range filter client-side', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, price: 1299, ratings: 4.5 }),
        mockProductDoc('prod-2', { ...sampleProduct, price: 500, ratings: 3.0 }),
        mockProductDoc('prod-3', { ...sampleProduct, price: 2500, ratings: 4.0 }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getProductsByGender('men', {
        priceRange: [1000, 2000],
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe(1299);
    });

    it('should apply rating filter client-side', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, price: 1299, ratings: 4.5 }),
        mockProductDoc('prod-2', { ...sampleProduct, price: 999, ratings: 2.0 }),
        mockProductDoc('prod-3', { ...sampleProduct, price: 1500, ratings: 3.5 }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getProductsByGender('men', {
        rating: 3,
      });

      expect(result.products).toHaveLength(2);
      expect(result.products.every((p) => p.ratings >= 3)).toBe(true);
    });

    it('should return lastDoc for pagination', async () => {
      const lastDocMock = mockProductDoc('prod-2', sampleProduct);
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [mockProductDoc('prod-1', { ...sampleProduct, price: 1000, ratings: 4 }), lastDocMock],
      } as any);

      const result = await getProductsByGender('men');

      expect(result.lastDoc).toBe(lastDocMock);
    });

    it('should return null lastDoc when no results', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await getProductsByGender('women');

      expect(result.products).toEqual([]);
      expect(result.lastDoc).toBeNull();
    });
  });

  describe('getSimilarProducts', () => {
    it('should return products from same category excluding current product', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, category: 'tees' }),
        mockProductDoc('prod-2', { ...sampleProduct, category: 'tees', title: 'Another Tee' }),
        mockProductDoc('current-prod', { ...sampleProduct, category: 'tees' }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getSimilarProducts('tees', 'current-prod', 4);

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.productId !== 'current-prod')).toBe(true);
    });

    it('should return empty array when no similar products exist', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await getSimilarProducts('tees', 'prod-1');

      expect(result).toEqual([]);
    });

    it('should limit results to count parameter', async () => {
      const products = Array.from({ length: 6 }, (_, i) =>
        mockProductDoc(`prod-${i}`, { ...sampleProduct, category: 'tees' })
      );

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await getSimilarProducts('tees', 'excluded-id', 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('searchProducts', () => {
    it('should find products matching title', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, title: 'Premium Navy Tee', category: 'tees', tags: ['navy'] }),
        mockProductDoc('prod-2', { ...sampleProduct, title: 'Black Hoodie', category: 'hoodies', tags: ['black'] }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await searchProducts('navy');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Premium Navy Tee');
    });

    it('should find products matching category', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, title: 'Premium Tee', category: 'tees', tags: [] }),
        mockProductDoc('prod-2', { ...sampleProduct, title: 'Black Hoodie', category: 'hoodies', tags: [] }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await searchProducts('hoodies');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('hoodies');
    });

    it('should find products matching tags', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, title: 'Tee', category: 'tees', tags: ['premium', 'cotton'] }),
        mockProductDoc('prod-2', { ...sampleProduct, title: 'Hoodie', category: 'hoodies', tags: ['winter'] }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await searchProducts('cotton');

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('cotton');
    });

    it('should be case-insensitive', async () => {
      const products = [
        mockProductDoc('prod-1', { ...sampleProduct, title: 'Premium Navy Tee', category: 'tees', tags: [] }),
      ];

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await searchProducts('PREMIUM');

      expect(result).toHaveLength(1);
    });

    it('should return max 20 results', async () => {
      const products = Array.from({ length: 25 }, (_, i) =>
        mockProductDoc(`prod-${i}`, { ...sampleProduct, title: `Tee ${i}`, category: 'tees', tags: ['tee'] })
      );

      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: products,
      } as any);

      const result = await searchProducts('tee');

      expect(result.length).toBeLessThanOrEqual(20);
    });
  });

  describe('createProduct', () => {
    it('should create a product and return the new id', async () => {
      const { createProduct: createProductFn } = await import('@/services/productService');
      const { addDoc } = await import('firebase/firestore');

      const productData = { ...sampleProduct };

      const result = await createProductFn(productData);

      expect(result).toBe('new-product-id');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('should update a product with the given data', async () => {
      const { updateProduct: updateProductFn } = await import('@/services/productService');
      const { updateDoc } = await import('firebase/firestore');

      await updateProductFn('prod-1', { title: 'Updated Title' });

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product by id', async () => {
      const { deleteProduct: deleteProductFn } = await import('@/services/productService');
      const { deleteDoc } = await import('firebase/firestore');

      await deleteProductFn('prod-1');

      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
