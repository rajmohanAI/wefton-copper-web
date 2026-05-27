'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';
import { slugify } from '@/lib/utils';
import { productFormSchema, type ProductFormData } from '@/lib/schemas';
import { createProduct, updateProduct, getProductBySlug } from '@/services/productService';
import { MEN_CATEGORIES, WOMEN_CATEGORIES, SIZES } from '@/config/brand';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Product, ProductImage, ProductVariant } from '@/types';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
}

const EMPTY_VARIANT: ProductVariant = {
  variantId: '',
  size: '',
  color: '',
  colorHex: '#000000',
  price: undefined,
  inventory: 0,
  sku: '',
};

export default function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormModalProps) {
  const isEditing = !!product;

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState<'men' | 'women' | 'unisex'>('men');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [inventory, setInventory] = useState('');
  const [sku, setSku] = useState('');
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugError, setSlugError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugManuallyEdited(false);
    setDescription('');
    setShortDescription('');
    setCategory('');
    setGender('men');
    setTags('');
    setPrice('');
    setComparePrice('');
    setInventory('');
    setSku('');
    setFeatured(false);
    setBestseller(false);
    setNewArrival(false);
    setVariants([]);
    setImages([]);
    setImageFiles([]);
  };

  // Reset form when modal opens/closes or product changes
  useEffect(() => {
    if (open) {
      if (product) {
        setTitle(product.title);
        setSlug(product.slug);
        setSlugManuallyEdited(true);
        setDescription(product.description);
        setShortDescription(product.shortDescription);
        setCategory(product.category);
        setGender(product.gender);
        setTags(product.tags?.join(', ') || '');
        setPrice(product.price.toString());
        setComparePrice(product.comparePrice?.toString() || '');
        setInventory(product.inventory.toString());
        setSku(product.sku);
        setFeatured(product.featured);
        setBestseller(product.bestseller);
        setNewArrival(product.newArrival);
        setVariants(product.variants || []);
        setImages(product.images || []);
        setImageFiles([]);
      } else {
        resetForm();
      }
      setErrors({});
      setSlugError('');
    }
  }, [open, product]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  const categories = gender === 'women' ? WOMEN_CATEGORIES : MEN_CATEGORIES;

  // Variant management
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { ...EMPTY_VARIANT, variantId: crypto.randomUUID() },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number | undefined) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) &&
        f.size <= 5 * 1024 * 1024
    );
    setImageFiles((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload images to Firebase Storage
  const uploadImages = useCallback(async (productId: string): Promise<ProductImage[]> => {
    const storage = getFirebaseStorage();
    if (!storage || imageFiles.length === 0) return [];

    const uploaded: ProductImage[] = [];
    for (const file of imageFiles) {
      const filename = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `products/${productId}/${filename}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({
        url,
        alt: title || file.name,
        isPrimary: images.length === 0 && uploaded.length === 0,
      });
    }
    return uploaded;
  }, [imageFiles, images.length, title]);

  // Slug uniqueness check
  const checkSlugUniqueness = async (slugToCheck: string): Promise<boolean> => {
    if (isEditing && product.slug === slugToCheck) return true;
    const existing = await getProductBySlug(slugToCheck);
    return existing === null;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSlugError('');

    const formData = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      shortDescription: shortDescription.trim(),
      category,
      gender,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      price: parseFloat(price) || 0,
      comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
      inventory: parseInt(inventory) || 0,
      sku: sku.trim(),
      featured,
      bestseller,
      newArrival,
      variants,
    };

    // Zod validation
    const result = productFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors({ ...fieldErrors, form: `Please fix ${Object.keys(fieldErrors).length} validation error(s): ${Object.values(fieldErrors).join(', ')}` });
      return;
    }

    setSubmitting(true);

    try {
      // Check slug uniqueness
      const slugUnique = await checkSlugUniqueness(formData.slug);
      if (!slugUnique) {
        setSlugError('This slug is already in use. Please choose a different slug.');
        setSubmitting(false);
        return;
      }

      if (isEditing) {
        // Upload new images
        setUploading(imageFiles.length > 0);
        const newImages = await uploadImages(product.productId);
        const allImages = [...images, ...newImages];

        await updateProduct(product.productId, {
          ...formData,
          images: allImages,
        });
      } else {
        // Create product first to get ID, then upload images
        const productId = await createProduct({
          ...formData,
          images: [],
          ratings: 0,
          reviewsCount: 0,
        });

        // Upload images with the product ID
        if (imageFiles.length > 0) {
          setUploading(true);
          const uploadedImages = await uploadImages(productId);
          if (uploadedImages.length > 0) {
            await updateProduct(productId, { images: uploadedImages });
          }
        }
      }

      setUploading(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      setErrors({ form: 'Failed to save product. Please try again.' });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
            <Dialog.Title className="text-lg font-light text-[var(--text-light)]">
              {isEditing ? 'Edit Product' : 'Add Product'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {errors.form && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {errors.form}
              </p>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={errors.title}
                  placeholder="Premium Cotton Tee"
                />
                <div className="flex flex-col gap-1.5">
                  <Input
                    label="Slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugManuallyEdited(true);
                      setSlugError('');
                    }}
                    error={errors.slug || slugError}
                    placeholder="premium-cotton-tee"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-sm p-3 placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]"
                  placeholder="Full product description..."
                />
                {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              </div>

              <Input
                label="Short Description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                error={errors.shortDescription}
                placeholder="Brief product summary"
              />
            </div>

            {/* Category & Gender */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">
                Classification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value as 'men' | 'women' | 'unisex');
                      setCategory('');
                    }}
                    className="h-11 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-sm px-3 focus:outline-none focus:border-[var(--copper-main)]"
                  >
                    <option value="men" className="bg-[var(--bg-dark)]">Men</option>
                    <option value="women" className="bg-[var(--bg-dark)]">Women</option>
                    <option value="unisex" className="bg-[var(--bg-dark)]">Unisex</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-400">{errors.gender}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-sm px-3 focus:outline-none focus:border-[var(--copper-main)]"
                  >
                    <option value="" className="bg-[var(--bg-dark)]">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug} className="bg-[var(--bg-dark)]">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
                </div>

                <Input
                  label="Tags (comma-separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="cotton, premium, summer"
                />
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">
                Pricing & Inventory
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  label="Price (₹)"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  error={errors.price}
                  placeholder="999"
                  min="0"
                />
                <Input
                  label="Compare Price (₹)"
                  type="number"
                  value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  error={errors.comparePrice}
                  placeholder="1499"
                  min="0"
                />
                <Input
                  label="Inventory"
                  type="number"
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  error={errors.inventory}
                  placeholder="100"
                  min="0"
                />
                <Input
                  label="SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  error={errors.sku}
                  placeholder="WC-PT-001"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">
                Badges
              </h3>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--copper-main)] focus:ring-[var(--copper-main)]"
                  />
                  <span className="text-sm text-[var(--text-light)]">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bestseller}
                    onChange={(e) => setBestseller(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--copper-main)] focus:ring-[var(--copper-main)]"
                  />
                  <span className="text-sm text-[var(--text-light)]">Bestseller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newArrival}
                    onChange={(e) => setNewArrival(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--copper-main)] focus:ring-[var(--copper-main)]"
                  />
                  <span className="text-sm text-[var(--text-light)]">New Arrival</span>
                </label>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">
                Images
              </h3>

              {/* Existing images */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded border border-white/10 overflow-hidden">
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      {img.isPrimary && (
                        <span className="absolute bottom-0 left-0 right-0 bg-[var(--copper-main)]/80 text-[9px] text-white text-center py-0.5">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New image files preview */}
              {imageFiles.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {imageFiles.map((file, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded border border-white/10 overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-[9px] text-white text-center py-0.5">
                        New
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-white/20 rounded cursor-pointer hover:border-[var(--copper-main)]/50 transition-colors">
                <Upload size={16} className="text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-muted)]">Upload images (JPEG, PNG, WebP, max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">
                  Variants
                </h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1 text-xs text-[var(--copper-light)] hover:text-[var(--copper-main)] transition-colors"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              {variants.length === 0 && (
                <p className="text-xs text-[var(--text-faint)] italic">
                  No variants added. Click &quot;Add Variant&quot; to add size/colour options.
                </p>
              )}

              {variants.map((variant, idx) => (
                <div
                  key={variant.variantId}
                  className="p-4 border border-white/10 rounded space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">Variant {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase">Size</label>
                      <select
                        value={variant.size || ''}
                        onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                        className="h-9 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-xs px-2 focus:outline-none focus:border-[var(--copper-main)]"
                      >
                        <option value="" className="bg-[var(--bg-dark)]">—</option>
                        {SIZES.map((s) => (
                          <option key={s} value={s} className="bg-[var(--bg-dark)]">{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase">Colour</label>
                      <input
                        value={variant.color || ''}
                        onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                        className="h-9 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-xs px-2 focus:outline-none focus:border-[var(--copper-main)]"
                        placeholder="Navy"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase">Hex</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={variant.colorHex || '#000000'}
                          onChange={(e) => updateVariant(idx, 'colorHex', e.target.value)}
                          className="w-9 h-9 rounded border border-white/10 cursor-pointer"
                        />
                        <input
                          value={variant.colorHex || ''}
                          onChange={(e) => updateVariant(idx, 'colorHex', e.target.value)}
                          className="h-9 flex-1 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-xs px-2 focus:outline-none focus:border-[var(--copper-main)]"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase">Price Override</label>
                      <input
                        type="number"
                        value={variant.price ?? ''}
                        onChange={(e) => updateVariant(idx, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="h-9 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-xs px-2 focus:outline-none focus:border-[var(--copper-main)]"
                        placeholder="—"
                        min="0"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase">Inventory</label>
                      <input
                        type="number"
                        value={variant.inventory}
                        onChange={(e) => updateVariant(idx, 'inventory', parseInt(e.target.value) || 0)}
                        className="h-9 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-xs px-2 focus:outline-none focus:border-[var(--copper-main)]"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[var(--text-muted)] uppercase">SKU</label>
                      <input
                        value={variant.sku || ''}
                        onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                        className="h-9 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-xs px-2 focus:outline-none focus:border-[var(--copper-main)]"
                        placeholder="WC-V-001"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="copper"
              onClick={handleSubmit}
              loading={submitting || uploading}
              disabled={submitting || uploading}
            >
              {uploading ? 'Uploading...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
