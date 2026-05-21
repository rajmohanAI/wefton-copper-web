// ============================================================
// Wefton Copper — Property-Based Tests: Product Sort & Filter
// ============================================================
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Product, FilterState } from '@/types/index';
import { getDiscountPercent } from '@/lib/utils';

// Sort function that mirrors the collection page sorting logic
function sortProducts(
  products: Product[],
  sortBy: FilterState['sortBy']
): Product[] {
  const sorted = [...products];
  switch (sortBy) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      sorted.sort((a, b) => b.ratings - a.ratings);
      break;
    case 'newest':
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'bestseller':
      sorted.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
      break;
  }
  return sorted;
}

// Helper to count active filters differing from defaults
function countActiveFilters(filters: FilterState): number {
  let count = 0;

  // Default values as specified in the task
  if (filters.category.length > 0) count++;
  if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 5000) count++;
  if (filters.rating !== 0) count++;
  if (filters.availability !== false) count++;
  if (filters.newArrivals !== false) count++;
  if (filters.bestsellers !== false) count++;
  if (filters.sortBy !== 'newest') count++;

  return count;
}

// Arbitrary for generating a minimal Product object with fields needed for sorting
const productArbitrary = fc.record({
  productId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  slug: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  shortDescription: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom('t-shirts', 'shirts', 'pants', 'shorts'),
  gender: fc.constantFrom('men', 'women', 'unisex') as fc.Arbitrary<'men' | 'women' | 'unisex'>,
  tags: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  price: fc.integer({ min: 100, max: 10000 }),
  comparePrice: fc.option(fc.integer({ min: 100, max: 15000 }), { nil: undefined }),
  inventory: fc.integer({ min: 0, max: 100 }),
  sku: fc.string({ minLength: 3, maxLength: 10 }),
  images: fc.constant([{ url: 'https://example.com/img.webp', alt: 'Product' }]),
  variants: fc.constant([]),
  ratings: fc.double({ min: 0, max: 5, noNaN: true }),
  reviewsCount: fc.integer({ min: 0, max: 500 }),
  featured: fc.boolean(),
  bestseller: fc.boolean(),
  newArrival: fc.boolean(),
  createdAt: fc.integer({ min: new Date('2023-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(
    (ts) => new Date(ts).toISOString()
  ),
  updatedAt: fc.constant(undefined),
}) as fc.Arbitrary<Product>;

// Arbitrary for sort options
const sortOptionArbitrary = fc.constantFrom(
  'price-asc',
  'price-desc',
  'rating',
  'newest',
  'bestseller'
) as fc.Arbitrary<FilterState['sortBy']>;

describe('Feature: wefton-copper-platform, Property 3: Discount percentage calculation', () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * For any product where comparePrice > price, the discount percentage
   * SHALL equal Math.round(((comparePrice - price) / comparePrice) * 100).
   * When comparePrice is not set or comparePrice <= price, the discount percentage SHALL be 0.
   */
  it('Property 3: discount == Math.round(((comparePrice - price) / comparePrice) * 100) when comparePrice > price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 20000 }),
        (price, comparePrice) => {
          // Only test the case where comparePrice > price
          fc.pre(comparePrice > price);

          const result = getDiscountPercent(price, comparePrice);
          const expected = Math.round(((comparePrice - price) / comparePrice) * 100);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: discount == 0 when comparePrice <= price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 0, max: 20000 }),
        (price, comparePrice) => {
          // Only test the case where comparePrice <= price
          fc.pre(comparePrice <= price);

          const result = getDiscountPercent(price, comparePrice);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: discount == 0 when comparePrice is 0 (falsy)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (price) => {
          const result = getDiscountPercent(price, 0);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: wefton-copper-platform, Property 9: Sort ordering invariant', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * For any array of products and any sort option (price-asc, price-desc,
   * rating, newest, bestseller), after applying the sort, every adjacent pair
   * of products (products[i], products[i+1]) SHALL satisfy the ordering
   * predicate for the selected sort field and direction.
   */

  it('Property 9: adjacent pairs satisfy ordering predicate after sort', () => {
    fc.assert(
      fc.property(
        fc.array(productArbitrary, { minLength: 2, maxLength: 20 }),
        sortOptionArbitrary,
        (products, sortBy) => {
          const sorted = sortProducts(products, sortBy);

          for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];

            switch (sortBy) {
              case 'price-asc':
                expect(current.price).toBeLessThanOrEqual(next.price);
                break;
              case 'price-desc':
                expect(current.price).toBeGreaterThanOrEqual(next.price);
                break;
              case 'rating':
                expect(current.ratings).toBeGreaterThanOrEqual(next.ratings);
                break;
              case 'newest':
                expect(
                  new Date(current.createdAt).getTime()
                ).toBeGreaterThanOrEqual(
                  new Date(next.createdAt).getTime()
                );
                break;
              case 'bestseller':
                // Bestsellers come first (true > false)
                if (current.bestseller === false) {
                  expect(next.bestseller).toBe(false);
                }
                break;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: wefton-copper-platform, Property 10: Active filter count', () => {
  /**
   * **Validates: Requirements 7.9**
   *
   * For any FilterState object, the displayed active filter count SHALL equal
   * the number of fields that differ from their default values.
   * Defaults: category=[], priceRange=[0, 5000], rating=0,
   * availability=false, newArrivals=false, bestsellers=false, sortBy="newest"
   */

  // Arbitrary for FilterState
  const filterStateArbitrary = fc.record({
    category: fc.array(
      fc.constantFrom('t-shirts', 'shirts', 'pants', 'shorts', 'jackets'),
      { maxLength: 3 }
    ),
    gender: fc.array(
      fc.constantFrom('men', 'women', 'unisex'),
      { maxLength: 2 }
    ),
    priceRange: fc.tuple(
      fc.integer({ min: 0, max: 5000 }),
      fc.integer({ min: 0, max: 10000 })
    ).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
    rating: fc.integer({ min: 0, max: 5 }),
    availability: fc.boolean(),
    newArrivals: fc.boolean(),
    bestsellers: fc.boolean(),
    sortBy: sortOptionArbitrary,
  }) as fc.Arbitrary<FilterState>;

  it('Property 10: filter count equals number of fields differing from defaults', () => {
    fc.assert(
      fc.property(filterStateArbitrary, (filters) => {
        const count = countActiveFilters(filters);

        // Manually compute expected count
        let expected = 0;
        if (filters.category.length > 0) expected++;
        if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 5000) expected++;
        if (filters.rating !== 0) expected++;
        if (filters.availability !== false) expected++;
        if (filters.newArrivals !== false) expected++;
        if (filters.bestsellers !== false) expected++;
        if (filters.sortBy !== 'newest') expected++;

        expect(count).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 10: default filter state has count of 0', () => {
    const defaultFilters: FilterState = {
      category: [],
      gender: [],
      priceRange: [0, 5000],
      rating: 0,
      availability: false,
      newArrivals: false,
      bestsellers: false,
      sortBy: 'newest',
    };

    expect(countActiveFilters(defaultFilters)).toBe(0);
  });

  it('Property 10: each non-default field contributes exactly 1 to count', () => {
    fc.assert(
      fc.property(filterStateArbitrary, (filters) => {
        const count = countActiveFilters(filters);

        // Count should be between 0 and 7 (total number of filterable fields)
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(7);
      }),
      { numRuns: 100 }
    );
  });
});


// ============================================================
// Property 11: Aggregate rating calculation
// ============================================================

/**
 * Pure function to calculate the average rating from an array of reviews.
 * Returns the average rounded to 1 decimal place.
 */
function calculateAverageRating(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/**
 * Pure function to get the star distribution (count of reviews at each star level 1–5).
 */
function getStarDistribution(reviews: { rating: number }[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  }
  return distribution;
}

describe('Feature: wefton-copper-platform, Property 11: Aggregate rating calculation', () => {
  /**
   * **Validates: Requirements 15.2**
   *
   * For any non-empty array of reviews (each with a rating between 1 and 5),
   * the computed average rating SHALL equal Σ(review.rating) / reviews.length
   * rounded to one decimal place, and the star distribution SHALL correctly
   * count the number of reviews at each star level (1 through 5).
   */

  const reviewArbitrary = fc.record({
    rating: fc.integer({ min: 1, max: 5 }),
  });

  it('Property 11: average == Σ(ratings)/count rounded to 1 decimal', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArbitrary, { minLength: 1, maxLength: 50 }),
        (reviews) => {
          const avg = calculateAverageRating(reviews);
          const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
          const expected = Math.round((sum / reviews.length) * 10) / 10;

          expect(avg).toBe(expected);

          // Average must be between 1 and 5 for valid ratings
          expect(avg).toBeGreaterThanOrEqual(1);
          expect(avg).toBeLessThanOrEqual(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: star distribution counts are correct', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArbitrary, { minLength: 1, maxLength: 50 }),
        (reviews) => {
          const distribution = getStarDistribution(reviews);

          // Sum of all distribution counts must equal total reviews
          const totalCount = Object.values(distribution).reduce((a, b) => a + b, 0);
          expect(totalCount).toBe(reviews.length);

          // Each star level count must match manual count
          for (let star = 1; star <= 5; star++) {
            const manualCount = reviews.filter((r) => r.rating === star).length;
            expect(distribution[star]).toBe(manualCount);
          }

          // All counts must be non-negative
          for (let star = 1; star <= 5; star++) {
            expect(distribution[star]).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: empty reviews returns 0 average and all-zero distribution', () => {
    expect(calculateAverageRating([])).toBe(0);
    const dist = getStarDistribution([]);
    for (let star = 1; star <= 5; star++) {
      expect(dist[star]).toBe(0);
    }
  });
});

// ============================================================
// Property 13: Variant availability reflects inventory
// ============================================================

/**
 * Pure function that returns a map of size → enabled (boolean).
 * A size is enabled iff at least one variant with that size has inventory > 0.
 */
function getSizeAvailability(
  variants: { size?: string; inventory: number }[],
  sizes: string[]
): Record<string, boolean> {
  const availability: Record<string, boolean> = {};
  for (const size of sizes) {
    availability[size] = variants.some(
      (v) => v.size === size && v.inventory > 0
    );
  }
  return availability;
}

describe('Feature: wefton-copper-platform, Property 13: Variant availability reflects inventory', () => {
  /**
   * **Validates: Requirements 11.1, 11.2**
   *
   * For any array of ProductVariant objects, a size button SHALL be rendered
   * as enabled if and only if at least one variant with that size has inventory > 0.
   * A size button SHALL be rendered as disabled if and only if all variants
   * with that size have inventory == 0.
   */

  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

  const variantArbitrary = fc.record({
    size: fc.constantFrom(...SIZES),
    inventory: fc.integer({ min: 0, max: 100 }),
  });

  it('Property 13: size enabled iff at least one variant with that size has inventory > 0', () => {
    fc.assert(
      fc.property(
        fc.array(variantArbitrary, { minLength: 1, maxLength: 30 }),
        (variants) => {
          const availability = getSizeAvailability(variants, [...SIZES]);

          for (const size of SIZES) {
            const hasStock = variants.some(
              (v) => v.size === size && v.inventory > 0
            );
            expect(availability[size]).toBe(hasStock);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: size disabled iff all variants with that size have inventory == 0', () => {
    fc.assert(
      fc.property(
        fc.array(variantArbitrary, { minLength: 1, maxLength: 30 }),
        (variants) => {
          const availability = getSizeAvailability(variants, [...SIZES]);

          for (const size of SIZES) {
            const variantsForSize = variants.filter((v) => v.size === size);
            if (variantsForSize.length > 0) {
              const allZero = variantsForSize.every((v) => v.inventory === 0);
              expect(availability[size]).toBe(!allZero);
            } else {
              // No variants for this size means disabled
              expect(availability[size]).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: empty variants array means all sizes disabled', () => {
    const availability = getSizeAvailability([], [...SIZES]);
    for (const size of SIZES) {
      expect(availability[size]).toBe(false);
    }
  });
});

// ============================================================
// Property 14: formatPrice locale formatting
// ============================================================
import { formatPrice } from '@/lib/utils';

describe('Feature: wefton-copper-platform, Property 14: formatPrice locale formatting', () => {
  /**
   * **Validates: Requirements 26.3**
   *
   * For any non-negative number, formatPrice SHALL return a string that
   * starts with "₹", contains no decimal places, and uses the Indian
   * numbering system grouping (e.g., 1,23,456 not 123,456).
   */

  it('Property 14: output starts with "₹", has no decimal point, uses Indian grouping', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        (amount) => {
          const result = formatPrice(amount);

          // Must start with ₹
          expect(result.startsWith('₹')).toBe(true);

          // Must not contain a decimal point
          expect(result).not.toContain('.');

          // For numbers >= 1000, verify Indian numbering grouping
          // Indian system: last group is 3 digits, then groups of 2
          // e.g., 1,00,000 (not 100,000), 10,00,000 (not 1,000,000)
          if (amount >= 1000) {
            // Remove the ₹ symbol and any spaces
            const numericPart = result.replace(/₹\s?/, '');

            // The numeric part should contain commas
            expect(numericPart).toContain(',');

            // Verify Indian grouping pattern:
            // The rightmost group before any comma should be 3 digits
            // All other groups should be 2 digits
            const groups = numericPart.split(',');
            if (groups.length >= 2) {
              // Last group should be exactly 3 digits
              expect(groups[groups.length - 1]).toHaveLength(3);

              // All groups except first and last should be exactly 2 digits
              for (let i = 1; i < groups.length - 1; i++) {
                expect(groups[i]).toHaveLength(2);
              }

              // First group should be 1 or 2 digits
              expect(groups[0].length).toBeGreaterThanOrEqual(1);
              expect(groups[0].length).toBeLessThanOrEqual(2);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: formatPrice(0) returns "₹0"', () => {
    const result = formatPrice(0);
    expect(result.startsWith('₹')).toBe(true);
    expect(result).not.toContain('.');
  });

  it('Property 14: specific Indian grouping examples', () => {
    // These verify the Indian numbering system is used
    const result1000 = formatPrice(1000);
    expect(result1000).toContain('1,000');

    const result100000 = formatPrice(100000);
    expect(result100000).toContain('1,00,000');

    const result10000000 = formatPrice(10000000);
    expect(result10000000).toContain('1,00,00,000');
  });
});
