'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Upload } from 'lucide-react';
import { uploadProductImages, filterValidImageFiles } from '@/services/productImageService';
import { slugify, cn } from '@/lib/utils';
import { productFormSchema } from '@/lib/schemas';
import { createProduct, updateProduct, getProductBySlug } from '@/services/productService';
import { fetchColors, createColor, reserveProductCodes } from '@/services/catalogAdminService';
import {
  CATALOG_SIZES,
  autoShortDescription,
  buildVariantSku,
  findColor,
  normalizeSize,
  skuBase,
  type CatalogColor,
} from '@/lib/productCodes';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Product, ProductImage, ProductVariant } from '@/types';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
}

// Solid, theme-aware field styling: the old translucent white fields
// disappeared on the light theme.
export const ADMIN_FIELD =
  'bg-[var(--wc-canvas)] border border-[var(--wc-line)] rounded text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)] focus:bg-[var(--wc-canvas)]';
const LABEL = 'text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]';
const SECTION = 'text-sm font-semibold text-[var(--text-light)] tracking-wider uppercase';

const cellKey = (color: string, size: string) => `${color.toLowerCase()}|${size}`;

/** A variant that has both a colour and a size can live in the colour × size grid. */
const fitsGrid = (v: ProductVariant) => !!v.color?.trim() && !!normalizeSize(v.size);

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
  const [shortManuallyEdited, setShortManuallyEdited] = useState(false);
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState<'men' | 'women' | 'unisex'>('men');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [inventory, setInventory] = useState('');
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Variant grid state
  const [colors, setColors] = useState<CatalogColor[]>([]);
  const [colorsError, setColorsError] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stock, setStock] = useState<Record<string, string>>({});
  const [otherVariants, setOtherVariants] = useState<ProductVariant[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#556B2F');
  const [addingColor, setAddingColor] = useState(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugError, setSlugError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const productCode = product?.productCode || '';

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugManuallyEdited(false);
    setDescription('');
    setShortDescription('');
    setShortManuallyEdited(false);
    setCategory('');
    setGender('men');
    setTags('');
    setPrice('');
    setComparePrice('');
    setInventory('');
    setFeatured(false);
    setBestseller(false);
    setNewArrival(false);
    setImages([]);
    setImageFiles([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setStock({});
    setOtherVariants([]);
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
        setShortManuallyEdited(true);
        setCategory(product.category);
        setGender(product.gender);
        setTags(product.tags?.join(', ') || '');
        setPrice(product.price.toString());
        setComparePrice(product.comparePrice?.toString() || '');
        setInventory(product.inventory.toString());
        setFeatured(product.featured);
        setBestseller(product.bestseller);
        setNewArrival(product.newArrival);
        setImages(product.images || []);
        setImageFiles([]);

        const variants = product.variants || [];
        const gridVariants = variants.filter(fitsGrid);
        const colorNames: string[] = [];
        for (const v of gridVariants) {
          const name = v.color!.trim();
          if (!colorNames.some((c) => c.toLowerCase() === name.toLowerCase())) colorNames.push(name);
        }
        const sizes = new Set(gridVariants.map((v) => normalizeSize(v.size)));
        setSelectedColors(colorNames);
        setSelectedSizes([
          ...CATALOG_SIZES.filter((s) => sizes.has(s)),
          ...[...sizes].filter((s) => !CATALOG_SIZES.includes(s)),
        ]);
        setStock(
          Object.fromEntries(
            gridVariants.map((v) => [cellKey(v.color!.trim(), normalizeSize(v.size)), String(v.inventory ?? 0)])
          )
        );
        setOtherVariants(variants.filter((v) => !fitsGrid(v)));
      } else {
        resetForm();
      }
      setErrors({});
      setSlugError('');
    }
  }, [open, product]);

  // Colour master
  useEffect(() => {
    if (!open) return;
    fetchColors()
      .then((list) => {
        setColors(list);
        setColorsError('');
      })
      .catch((e: unknown) => setColorsError(e instanceof Error ? e.message : 'Could not load the colour list'));
  }, [open]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  const categories = gender === 'women' ? WOMEN_CATEGORIES : MEN_CATEGORIES;

  const hasGrid = selectedColors.length > 0 && selectedSizes.length > 0;
  const gridTotal = useMemo(
    () =>
      selectedColors.reduce(
        (sum, c) => sum + selectedSizes.reduce((s, z) => s + (parseInt(stock[cellKey(c, z)] || '0', 10) || 0), 0),
        0
      ),
    [selectedColors, selectedSizes, stock]
  );
  const otherTotal = otherVariants.reduce((s, v) => s + (Number(v.inventory) || 0), 0);
  const hasVariants = hasGrid || otherVariants.length > 0;
  const unknownColors = selectedColors.filter((c) => !findColor(colors, c));

  const toggleColor = (name: string) => {
    setSelectedColors((prev) =>
      prev.some((c) => c.toLowerCase() === name.toLowerCase())
        ? prev.filter((c) => c.toLowerCase() !== name.toLowerCase())
        : [...prev, name]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size)
        ? prev.filter((s) => s !== size)
        : CATALOG_SIZES.filter((s) => s === size || prev.includes(s))
    );
  };

  const handleAddColor = async (name: string, hex: string) => {
    if (!name.trim()) return;
    setAddingColor(true);
    setColorsError('');
    try {
      const next = await createColor(name.trim(), hex);
      setColors(next);
      const added = findColor(next, name);
      if (added && !selectedColors.some((c) => c.toLowerCase() === added.name.toLowerCase())) {
        setSelectedColors((prev) => [...prev, added.name]);
      }
      setNewColorName('');
    } catch (e: unknown) {
      setColorsError(e instanceof Error ? e.message : 'Could not add colour');
    } finally {
      setAddingColor(false);
    }
  };

  /** Builds the variant list from the grid, keeping ids and price overrides of existing variants. */
  const buildVariants = (code: string): ProductVariant[] => {
    const existing = new Map(
      (product?.variants || []).filter(fitsGrid).map((v) => [cellKey(v.color!.trim(), normalizeSize(v.size)), v])
    );
    const grid: ProductVariant[] = [];
    for (const colorName of selectedColors) {
      const master = findColor(colors, colorName);
      for (const size of selectedSizes) {
        const key = cellKey(colorName, size);
        const prev = existing.get(key);
        grid.push({
          ...(prev ?? {}),
          variantId: prev?.variantId || crypto.randomUUID(),
          color: master?.name ?? colorName,
          colorHex: master?.hex ?? prev?.colorHex ?? '#000000',
          size,
          inventory: parseInt(stock[key] || '0', 10) || 0,
          sku: buildVariantSku(code, master?.code, size) ?? prev?.sku ?? '',
        });
      }
    }
    return [...grid, ...otherVariants];
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = filterValidImageFiles(files);
    setImageFiles((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload images to Firebase Storage (delegates to shared service)
  const uploadImages = useCallback(async (productId: string): Promise<ProductImage[]> => {
    if (imageFiles.length === 0) return [];
    const { uploaded } = await uploadProductImages(
      productId,
      imageFiles,
      title,
      images.length === 0 // mark first as primary only if no existing images
    );
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

    if (selectedColors.length > 0 !== selectedSizes.length > 0) {
      setErrors({ form: 'Pick at least one colour and one size for the variants, or clear both.' });
      return;
    }
    if (hasGrid && unknownColors.length > 0) {
      setErrors({ form: `Add ${unknownColors.join(', ')} to the colour list first, so the SKU can be generated.` });
      return;
    }

    const draftVariants = buildVariants(productCode || 'WCPM001');
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
      inventory: hasVariants ? gridTotal + otherTotal : parseInt(inventory) || 0,
      sku: product?.sku || '',
      featured,
      bestseller,
      newArrival,
      variants: draftVariants,
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

      // The Product ID is created once, on the first save.
      const code = productCode || (await reserveProductCodes(gender, 1))[0];
      const data = {
        ...formData,
        productCode: code,
        sku: skuBase(code) || formData.sku,
        variants: buildVariants(code),
      };

      if (isEditing) {
        // Upload new images
        setUploading(imageFiles.length > 0);
        const newImages = await uploadImages(product.productId);
        const allImages = [...images, ...newImages];

        await updateProduct(product.productId, {
          ...data,
          images: allImages,
        });
      } else {
        // Create product first to get ID, then upload images
        const productId = await createProduct({
          ...data,
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
      const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
      setErrors({ form: `Failed to save product. Please try again.${detail}` });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const skuPreview = (colorName: string, size: string) => {
    const master = findColor(colors, colorName);
    const code = productCode || `WCP${gender === 'women' ? 'W' : gender === 'unisex' ? 'U' : 'M'}000`;
    const sku = buildVariantSku(code, master?.code, size);
    return sku ? (productCode ? sku : sku.replace(/^WCP00/, 'WCP##')) : '—';
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[90vh] bg-[var(--wc-surface)] text-[var(--text-light)] border border-[var(--wc-line)] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--wc-line)]">
            <div>
              <Dialog.Title className="text-lg font-normal text-[var(--text-light)]">
                {isEditing ? 'Edit Product' : 'Add Product'}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--text-muted)]">
                Product ID: {productCode ? <span className="font-mono text-[var(--copper-light)]">{productCode}</span> : 'generated when you save'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
            {errors.form && (
              <p className="text-sm text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                {errors.form}
              </p>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className={SECTION}>Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={errors.title}
                  placeholder="Crew Neck T-shirt"
                  className={ADMIN_FIELD}
                />
                <Input
                  label="Slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManuallyEdited(true);
                    setSlugError('');
                  }}
                  error={errors.slug || slugError}
                  placeholder="filled in from the title"
                  className={ADMIN_FIELD}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="product-description" className={LABEL}>
                  Description
                </label>
                <textarea
                  id="product-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    // Short description follows the description until edited by hand.
                    if (!shortManuallyEdited) setShortDescription(autoShortDescription(e.target.value));
                  }}
                  rows={4}
                  className={cn('w-full text-sm p-3', ADMIN_FIELD)}
                  placeholder="Full product description..."
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
              </div>

              <Input
                label="Short Description"
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  setShortManuallyEdited(true);
                }}
                error={errors.shortDescription}
                placeholder="filled in from the description"
                className={ADMIN_FIELD}
              />
            </div>

            {/* Category & Gender */}
            <div className="space-y-4">
              <h3 className={SECTION}>Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="product-gender" className={LABEL}>
                    Gender
                  </label>
                  <select
                    id="product-gender"
                    value={gender}
                    disabled={!!productCode}
                    title={productCode ? 'Gender is part of the Product ID and cannot change' : undefined}
                    onChange={(e) => {
                      setGender(e.target.value as 'men' | 'women' | 'unisex');
                      setCategory('');
                    }}
                    className={cn('h-11 text-sm px-3 disabled:opacity-60', ADMIN_FIELD)}
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="product-category" className={LABEL}>
                    Category
                  </label>
                  <select
                    id="product-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={cn('h-11 text-sm px-3', ADMIN_FIELD)}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                </div>

                <Input
                  label="Tags (comma-separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="cotton, premium, summer"
                  className={ADMIN_FIELD}
                />
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="space-y-4">
              <h3 className={SECTION}>Pricing &amp; Inventory</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Price (₹)"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  error={errors.price}
                  placeholder="999"
                  min="0"
                  className={ADMIN_FIELD}
                />
                <Input
                  label="Compare Price (₹)"
                  type="number"
                  value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  error={errors.comparePrice}
                  placeholder="1499"
                  min="0"
                  className={ADMIN_FIELD}
                />
                <Input
                  label={hasVariants ? 'Inventory (total of variants)' : 'Inventory'}
                  type="number"
                  value={hasVariants ? String(gridTotal + otherTotal) : inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  readOnly={hasVariants}
                  error={errors.inventory}
                  placeholder="100"
                  min="0"
                  className={cn(ADMIN_FIELD, hasVariants && 'opacity-70')}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                SKU: <span className="font-mono">{productCode ? skuBase(productCode) : 'generated from the Product ID'}</span>
                {' '}· each variant gets its own SKU (model no + gender + colour no + size no).
              </p>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <h3 className={SECTION}>Badges</h3>
              <div className="flex flex-wrap gap-6">
                {([
                  ['Featured', featured, setFeatured],
                  ['Bestseller', bestseller, setBestseller],
                  ['New Arrival', newArrival, setNewArrival],
                ] as const).map(([label, checked, set]) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => set(e.target.checked)}
                      className="w-4 h-4 rounded accent-[var(--copper-main)]"
                    />
                    <span className="text-sm text-[var(--text-light)]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <h3 className={SECTION}>Variants</h3>
              {colorsError && <p className="text-xs text-red-500">{colorsError}</p>}

              <div className="space-y-2">
                <p className={LABEL}>Colours</p>
                <div className="flex flex-wrap gap-2">
                  {[...colors.map((c) => c.name), ...unknownColors].map((name) => {
                    const master = findColor(colors, name);
                    const active = selectedColors.some((c) => c.toLowerCase() === name.toLowerCase());
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleColor(name)}
                        className={cn(
                          'flex items-center gap-2 h-9 px-3 rounded-full border text-xs transition-colors',
                          active
                            ? 'border-[var(--copper-main)] bg-[var(--copper-glow)] text-[var(--text-light)]'
                            : 'border-[var(--wc-line)] text-[var(--text-muted)] hover:border-[var(--copper-main)]'
                        )}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: master?.hex ?? 'transparent' }}
                        />
                        {name}
                        <span className="font-mono text-[10px] text-[var(--text-faint)]">{master ? master.code : 'not in list'}</span>
                      </button>
                    );
                  })}
                </div>
                {unknownColors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <span>Not in the colour list yet:</span>
                    {unknownColors.map((name) => (
                      <button
                        key={name}
                        type="button"
                        disabled={addingColor}
                        onClick={() => handleAddColor(name, '#000000')}
                        className="underline hover:text-[var(--copper-light)]"
                      >
                        add {name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="New colour name"
                    aria-label="New colour name"
                    className={cn('h-9 text-xs px-3 w-44', ADMIN_FIELD)}
                  />
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    aria-label="New colour swatch"
                    className="w-9 h-9 rounded border border-[var(--wc-line)] cursor-pointer bg-transparent"
                  />
                  <button
                    type="button"
                    disabled={addingColor || !newColorName.trim()}
                    onClick={() => handleAddColor(newColorName, newColorHex)}
                    className="flex items-center gap-1 h-9 px-3 rounded border border-[var(--wc-line)] text-xs text-[var(--copper-light)] hover:border-[var(--copper-main)] disabled:opacity-50"
                  >
                    <Plus size={14} /> Add colour
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className={LABEL}>Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {CATALOG_SIZES.map((size) => {
                    const active = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={cn(
                          'h-9 min-w-11 px-3 rounded border text-xs transition-colors',
                          active
                            ? 'border-[var(--copper-main)] bg-[var(--copper-glow)] text-[var(--text-light)]'
                            : 'border-[var(--wc-line)] text-[var(--text-muted)] hover:border-[var(--copper-main)]'
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasGrid ? (
                <div className="overflow-x-auto border border-[var(--wc-line)] rounded">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--wc-canvas)] text-[var(--text-muted)]">
                        <th className="text-left font-medium px-3 py-2">Stock</th>
                        {selectedSizes.map((s) => (
                          <th key={s} className="font-medium px-2 py-2">{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedColors.map((colorName) => (
                        <tr key={colorName} className="border-t border-[var(--wc-line)]">
                          <td className="px-3 py-2 whitespace-nowrap text-[var(--text-light)]">{colorName}</td>
                          {selectedSizes.map((size) => {
                            const key = cellKey(colorName, size);
                            return (
                              <td key={size} className="px-2 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={stock[key] ?? ''}
                                  onChange={(e) => setStock((prev) => ({ ...prev, [key]: e.target.value }))}
                                  placeholder="0"
                                  aria-label={`${colorName} ${size} stock`}
                                  className={cn('h-8 w-16 text-xs px-2 text-center', ADMIN_FIELD)}
                                />
                                <div className="mt-1 font-mono text-[9px] text-[var(--text-faint)]">{skuPreview(colorName, size)}</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">
                  Pick colours and sizes to build the variant grid, then enter the stock for each one.
                </p>
              )}

              {otherVariants.length > 0 && (
                <div className="space-y-2">
                  <p className={LABEL}>Older variants (no colour or size, kept as they are)</p>
                  {otherVariants.map((v, idx) => (
                    <div key={v.variantId} className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="min-w-32 text-[var(--text-light)]">
                        {[v.color, v.size].filter(Boolean).join(' / ') || 'Default'}
                      </span>
                      <span className="font-mono text-[var(--text-faint)]">{v.sku || 'no SKU'}</span>
                      <input
                        type="number"
                        min="0"
                        value={v.inventory}
                        onChange={(e) =>
                          setOtherVariants((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, inventory: parseInt(e.target.value) || 0 } : x))
                          )
                        }
                        aria-label="Stock"
                        className={cn('h-8 w-20 text-xs px-2', ADMIN_FIELD)}
                      />
                      <button
                        type="button"
                        onClick={() => setOtherVariants((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className={SECTION}>Images</h3>

              {/* Existing images */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded border border-[var(--wc-line)] overflow-hidden">
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      {img.isPrimary && (
                        <span className="absolute bottom-0 left-0 right-0 bg-[var(--copper-main)]/80 text-[0.5625rem] text-white text-center py-0.5">
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
                    <div key={idx} className="relative group w-20 h-20 rounded border border-[var(--wc-line)] overflow-hidden">
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
                      <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-[0.5625rem] text-white text-center py-0.5">
                        New
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-[var(--wc-line)] rounded cursor-pointer hover:border-[var(--copper-main)] transition-colors">
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
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--wc-line)]">
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
