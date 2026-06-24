// ============================================================
// Wefton Copper — Zod Validation Schemas
// ============================================================

import { z } from 'zod';

/**
 * Address validation schema
 * Validates delivery address fields for checkout (Step 1)
 * Requirements: 21.3, 22.5, 22.6
 */
export const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  country: z.string().min(1, 'Country is required'),
});

export type AddressFormData = z.infer<typeof addressSchema>;

/**
 * Review submission validation schema
 * Validates rating (1–5 integer) and comment (10–500 chars)
 * Requirements: 15.6
 */
export const reviewSchema = z.object({
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(500, 'Comment must be at most 500 characters'),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

/**
 * Email validation schema
 * Used for newsletter subscription and auth forms
 * Requirements: 6.3, 16.8
 */
export const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type EmailFormData = z.infer<typeof emailSchema>;

/**
 * File upload validation schema
 * Validates payment screenshot uploads (type and size)
 * Accepts: JPEG, PNG, WebP — max 10MB
 * Requirements: 23.6
 */
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const fileUploadSchema = z.object({
  type: z
    .string()
    .refine(
      (type) => (ACCEPTED_FILE_TYPES as readonly string[]).includes(type),
      'File must be JPEG, PNG, or WebP'
    ),
  size: z
    .number()
    .max(MAX_FILE_SIZE, 'File size must be 10MB or less'),
});

export type FileUploadData = z.infer<typeof fileUploadSchema>;

/**
 * Product variant validation schema
 * Requirements: 27.7
 */
export const productVariantSchema = z.object({
  variantId: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  colorHex: z.string().optional(),
  price: z.number().positive('Price must be positive').optional(),
  inventory: z.number().int().min(0, 'Inventory must be 0 or more'),
  sku: z.string().optional(),
});

export type ProductVariantFormData = z.infer<typeof productVariantSchema>;

/**
 * Product form validation schema
 * Validates all required fields for product creation/update
 * Requirements: 27.2, 27.4
 */
export const productFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)'),
  description: z.string().min(1, 'Description is required'),
  shortDescription: z.string().min(1, 'Short description is required'),
  category: z.string().min(1, 'Category is required'),
  gender: z.enum(['men', 'women', 'unisex'], { message: 'Gender is required' }),
  tags: z.array(z.string()),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().positive('Compare price must be positive').optional(),
  inventory: z.number().int().min(0, 'Inventory must be 0 or more'),
  sku: z.string().min(1, 'SKU is required'),
  featured: z.boolean(),
  bestseller: z.boolean(),
  newArrival: z.boolean(),
  variants: z.array(productVariantSchema),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

/**
 * Coupon validation schema
 * Validates coupon code (uppercase alphanumeric, max 20 chars),
 * discount (integer 1–100%), active status, and optional expiry date.
 * Requirements: 13.2, 13.3, 13.4
 */
export const couponSchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .max(20, 'Code must be 20 characters or less')
    .transform(v => v.toUpperCase())
    .refine(v => /^[A-Z0-9_-]+$/.test(v), 'Code must be alphanumeric'),
  discount: z.number()
    .int('Discount must be a whole number')
    .min(1, 'Minimum discount is 1%')
    .max(100, 'Maximum discount is 100%'),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type CouponFormData = z.infer<typeof couponSchema>;
