// ============================================================
// Wefton Copper — Address Validation Property-Based Tests
// ============================================================
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { addressSchema, fileUploadSchema, reviewSchema } from '@/lib/schemas';

describe('Feature: wefton-copper-platform, Property 5: Address form validation', () => {
  /**
   * **Validates: Requirements 21.3, 22.5, 22.6**
   *
   * addressSchema passes only for valid inputs:
   * - non-empty name
   * - 10-digit phone
   * - non-empty line1, city, state
   * - 6-digit pincode
   */

  // Arbitraries for valid address fields
  const validNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
  const validPhoneArb = fc.string({ minLength: 10, maxLength: 10, unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9') });
  const validLine1Arb = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);
  const validCityArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
  const validStateArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
  const validPincodeArb = fc.string({ minLength: 6, maxLength: 6, unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9') });
  const validCountryArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  it('Property 5: valid address inputs always pass validation', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validPhoneArb,
        validLine1Arb,
        validCityArb,
        validStateArb,
        validPincodeArb,
        validCountryArb,
        (name, phone, line1, city, state, pincode, country) => {
          const input = { name, phone, line1, city, state, pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: empty name always fails validation', () => {
    fc.assert(
      fc.property(
        validPhoneArb,
        validLine1Arb,
        validCityArb,
        validStateArb,
        validPincodeArb,
        validCountryArb,
        (phone, line1, city, state, pincode, country) => {
          const input = { name: '', phone, line1, city, state, pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: non-10-digit phone always fails validation', () => {
    // Generate phone strings that are NOT exactly 10 digits
    const invalidPhoneArb = fc.string({ minLength: 0, maxLength: 20 }).filter(
      (s) => !/^\d{10}$/.test(s)
    );

    fc.assert(
      fc.property(
        validNameArb,
        invalidPhoneArb,
        validLine1Arb,
        validCityArb,
        validStateArb,
        validPincodeArb,
        validCountryArb,
        (name, phone, line1, city, state, pincode, country) => {
          const input = { name, phone, line1, city, state, pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: non-6-digit pincode always fails validation', () => {
    // Generate pincode strings that are NOT exactly 6 digits
    const invalidPincodeArb = fc.string({ minLength: 0, maxLength: 15 }).filter(
      (s) => !/^\d{6}$/.test(s)
    );

    fc.assert(
      fc.property(
        validNameArb,
        validPhoneArb,
        validLine1Arb,
        validCityArb,
        validStateArb,
        invalidPincodeArb,
        validCountryArb,
        (name, phone, line1, city, state, pincode, country) => {
          const input = { name, phone, line1, city, state, pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: empty line1 always fails validation', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validPhoneArb,
        validCityArb,
        validStateArb,
        validPincodeArb,
        validCountryArb,
        (name, phone, city, state, pincode, country) => {
          const input = { name, phone, line1: '', city, state, pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: empty city always fails validation', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validPhoneArb,
        validLine1Arb,
        validStateArb,
        validPincodeArb,
        validCountryArb,
        (name, phone, line1, state, pincode, country) => {
          const input = { name, phone, line1, city: '', state, pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: empty state always fails validation', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validPhoneArb,
        validLine1Arb,
        validCityArb,
        validPincodeArb,
        validCountryArb,
        (name, phone, line1, city, pincode, country) => {
          const input = { name, phone, line1, city, state: '', pincode, country };
          const result = addressSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 6: File Upload Validation
// ============================================================

describe('Feature: wefton-copper-platform, Property 6: File upload validation', () => {
  /**
   * **Validates: Requirements 23.6**
   *
   * For any file metadata (type and size), the payment screenshot validator
   * SHALL accept only files where type is one of image/jpeg, image/png, or
   * image/webp AND size <= 5 * 1024 * 1024 bytes. All other files SHALL be rejected.
   */

  const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  // Arbitrary for valid file types
  const validTypeArb = fc.constantFrom(...VALID_TYPES);

  // Arbitrary for valid file sizes (1 byte to 5MB)
  const validSizeArb = fc.integer({ min: 1, max: MAX_SIZE });

  // Arbitrary for invalid file types (not jpeg/png/webp)
  const invalidTypeArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
    (s) => !VALID_TYPES.includes(s as typeof VALID_TYPES[number])
  );

  // Arbitrary for invalid file sizes (> 5MB)
  const invalidSizeArb = fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE * 10 });

  it('Property 6: valid file type and size always passes validation', () => {
    fc.assert(
      fc.property(validTypeArb, validSizeArb, (type, size) => {
        const result = fileUploadSchema.safeParse({ type, size });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: invalid file type always fails validation', () => {
    fc.assert(
      fc.property(invalidTypeArb, validSizeArb, (type, size) => {
        const result = fileUploadSchema.safeParse({ type, size });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: file size exceeding 5MB always fails validation', () => {
    fc.assert(
      fc.property(validTypeArb, invalidSizeArb, (type, size) => {
        const result = fileUploadSchema.safeParse({ type, size });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: both invalid type and invalid size fails validation', () => {
    fc.assert(
      fc.property(invalidTypeArb, invalidSizeArb, (type, size) => {
        const result = fileUploadSchema.safeParse({ type, size });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 7: Review Form Validation
// ============================================================

describe('Feature: wefton-copper-platform, Property 7: Review form validation', () => {
  /**
   * **Validates: Requirements 15.6**
   *
   * For any review submission input, the review Zod schema SHALL pass
   * validation only when: rating is an integer between 1 and 5 inclusive,
   * and comment is a string with length between 10 and 500 characters inclusive.
   * All other inputs SHALL be rejected.
   */

  // Arbitrary for valid ratings (integers 1–5)
  const validRatingArb = fc.integer({ min: 1, max: 5 });

  // Arbitrary for valid comments (10–500 chars)
  const validCommentArb = fc.string({ minLength: 10, maxLength: 500 }).filter(
    (s) => s.length >= 10 && s.length <= 500
  );

  // Arbitrary for invalid ratings (non-integers or out of range)
  const invalidRatingArb = fc.oneof(
    fc.integer({ min: -100, max: 0 }),       // too low
    fc.integer({ min: 6, max: 100 }),        // too high
    fc.double({ min: 1.1, max: 4.9, noNaN: true }).filter((n) => !Number.isInteger(n)) // non-integer
  );

  // Arbitrary for invalid comments (too short or too long)
  const invalidCommentArb = fc.oneof(
    fc.string({ minLength: 0, maxLength: 9 }),   // too short
    fc.string({ minLength: 501, maxLength: 600 }) // too long
  );

  it('Property 7: valid rating and comment always passes validation', () => {
    fc.assert(
      fc.property(validRatingArb, validCommentArb, (rating, comment) => {
        const result = reviewSchema.safeParse({ rating, comment });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: invalid rating always fails validation', () => {
    fc.assert(
      fc.property(invalidRatingArb, validCommentArb, (rating, comment) => {
        const result = reviewSchema.safeParse({ rating, comment });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: invalid comment length always fails validation', () => {
    fc.assert(
      fc.property(validRatingArb, invalidCommentArb, (rating, comment) => {
        const result = reviewSchema.safeParse({ rating, comment });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: both invalid rating and comment fails validation', () => {
    fc.assert(
      fc.property(invalidRatingArb, invalidCommentArb, (rating, comment) => {
        const result = reviewSchema.safeParse({ rating, comment });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
