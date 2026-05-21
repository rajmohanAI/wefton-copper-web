'use client';

import { useState, useRef, useCallback, type MouseEvent, type TouchEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Share2,
  ChevronLeft,
  ChevronRight,
  Truck,
  RotateCcw,
  Shield,
  Check,
  ZoomIn,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, getDiscountPercent } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimilarProducts from '@/components/product/SimilarProducts';
import ReviewSection from '@/components/product/ReviewSection';
import type { Product } from '@/types';
import { SIZES } from '@/config/brand';
import { cn } from '@/lib/utils';

interface ProductDetailClientProps {
  product: Product;
  similar: Product[];
}

/** Generate JSON-LD Product structured data */
function getProductJsonLd(product: Product) {
  const availability =
    product.inventory > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images?.map((img) => img.url) || [],
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability,
    },
  };

  if (product.reviewsCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.ratings,
      reviewCount: product.reviewsCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

export default function ProductDetailClient({ product, similar }: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Hover zoom state
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Touch swipe state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef(0);

  const { addItem, openCart } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const isWishlisted = has(product.productId);
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);

  const currentPrice = selectedVariant?.price || product.price;
  const currentInventory = selectedVariant?.inventory ?? product.inventory;

  // ── Hover Zoom Handlers (Desktop) ──────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsZooming(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsZooming(false);
    setZoomPosition({ x: 50, y: 50 });
  }, []);

  // ── Touch Swipe Handlers (Mobile) ─────────────────────────
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDeltaRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    touchDeltaRef.current = touch.clientX - touchStartRef.current.x;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaRef.current;
    const threshold = 50; // minimum swipe distance in px
    if (Math.abs(delta) > threshold) {
      if (delta < 0) {
        // Swipe left → next image
        setSelectedImage((i) => (i + 1) % product.images.length);
      } else {
        // Swipe right → previous image
        setSelectedImage((i) => (i - 1 + product.images.length) % product.images.length);
      }
    }
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
  }, [product.images.length]);

  const handleAddToCart = () => {
    if (!selectedSize && product.variants?.length > 0) {
      alert('Please select a size');
      return;
    }
    setAdding(true);
    addItem({
      productId: product.productId,
      title: product.title,
      slug: product.slug,
      image: product.images?.[0]?.url || '',
      price: currentPrice,
      quantity,
      size: selectedSize,
      color: selectedVariant?.color,
      colorHex: selectedVariant?.colorHex,
      variantId: selectedVariant?.variantId,
      inventory: currentInventory,
    });
    setTimeout(() => {
      setAdding(false);
      setAdded(true);
      openCart();
      setTimeout(() => setAdded(false), 2000);
    }, 600);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const prevImage = () =>
    setSelectedImage((i) => (i - 1 + product.images.length) % product.images.length);
  const nextImage = () =>
    setSelectedImage((i) => (i + 1) % product.images.length);

  // Unique sizes from variants
  const availableSizes = product.variants?.length
    ? [...new Set(product.variants.map((v) => v.size).filter(Boolean))]
    : SIZES;

  // Unique colors from variants
  const colors = product.variants?.filter((v) => v.color) || [];

  // JSON-LD structured data
  const jsonLd = getProductJsonLd(product);

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--copper-light)] transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/${product.gender}`} className="hover:text-[var(--copper-light)] transition-colors capitalize">
            {product.gender}
          </Link>
          <span>/</span>
          <span className="text-[var(--text-light)] truncate max-w-[200px]">{product.title}</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image with Hover Zoom and Touch Swipe */}
            <div
              ref={imageContainerRef}
              className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--bg-darker)] group"
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="img"
              aria-label={`Product image gallery showing ${product.images?.[selectedImage]?.alt || product.title}`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  {product.images?.[selectedImage] && (
                    <Image
                      src={product.images[selectedImage].url}
                      alt={product.images[selectedImage].alt || product.title}
                      fill
                      className={cn(
                        'object-cover transition-transform duration-300 ease-out',
                        isZooming
                          ? 'scale-[2] cursor-zoom-out'
                          : 'scale-100 cursor-zoom-in'
                      )}
                      style={
                        isZooming
                          ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
                          : undefined
                      }
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Nav arrows */}
              {product.images?.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full glass flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Zoom hint (hidden on touch devices) */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                <div className="glass rounded px-2 py-1 flex items-center gap-1 text-[10px] text-white/70">
                  <ZoomIn size={10} /> Hover to zoom
                </div>
              </div>

              {/* Swipe indicator dots (visible on touch devices only) */}
              {product.images?.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 md:hidden">
                  <div className="flex gap-1.5">
                    {product.images.map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full transition-colors',
                          i === selectedImage ? 'bg-white' : 'bg-white/30'
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                {product.newArrival && <Badge variant="copper">New</Badge>}
                {product.bestseller && <Badge variant="success">Bestseller</Badge>}
                {discount > 0 && <Badge variant="warning">{discount}% Off</Badge>}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Product image thumbnails">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    role="tab"
                    aria-selected={i === selectedImage}
                    className={cn(
                      'relative flex-shrink-0 w-16 h-20 rounded overflow-hidden border-2 transition-colors',
                      i === selectedImage
                        ? 'border-[var(--copper-main)]'
                        : 'border-transparent hover:border-white/20'
                    )}
                    aria-label={img.alt || `View image ${i + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt || `${product.title} thumbnail ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
            {/* Title & Price */}
            <div>
              <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-2 capitalize">
                {product.category}
              </p>
              <h1 className="text-2xl md:text-3xl font-light text-[var(--text-light)] leading-tight">
                {product.title}
              </h1>

              {/* Rating */}
              {product.reviewsCount > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <StarRating rating={product.ratings} size={14} />
                  <span className="text-xs text-[var(--text-muted)]">
                    {product.ratings.toFixed(1)} ({product.reviewsCount} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-3 mt-4">
                <span className="text-2xl font-medium text-[var(--copper-light)]">
                  {formatPrice(currentPrice)}
                </span>
                {product.comparePrice && product.comparePrice > currentPrice && (
                  <>
                    <span className="text-base text-[var(--text-faint)] line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                    <Badge variant="warning">{discount}% Off</Badge>
                  </>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Inclusive of all taxes</p>
            </div>

            {/* Color Variants */}
            {colors.length > 0 && (
              <div>
                <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-3">
                  Color: <span className="text-[var(--text-light)]">{selectedVariant?.color}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((v) => (
                    <button
                      key={v.variantId}
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        selectedVariant?.variantId === v.variantId
                          ? 'border-[var(--copper-light)] scale-110'
                          : 'border-transparent hover:border-white/30'
                      )}
                      style={{ backgroundColor: v.colorHex || '#888' }}
                      title={v.color}
                      aria-label={`Select color ${v.color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs tracking-widest uppercase text-[var(--text-muted)]">
                  Size: <span className="text-[var(--text-light)]">{selectedSize || 'Select'}</span>
                </p>
                <Link href="/size-guide" className="text-xs text-[var(--copper-light)] hover:underline">
                  Size Guide
                </Link>
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableSizes.map((size) => {
                  const variant = product.variants?.find((v) => v.size === size);
                  const outOfStock = variant ? variant.inventory === 0 : false;
                  return (
                    <button
                      key={size}
                      onClick={() => !outOfStock && setSelectedSize(size as string)}
                      disabled={outOfStock}
                      className={cn(
                        'w-12 h-10 rounded border text-xs font-medium transition-all',
                        selectedSize === size
                          ? 'bg-[var(--copper-main)] border-[var(--copper-main)] text-white'
                          : outOfStock
                          ? 'border-white/5 text-[var(--text-faint)] cursor-not-allowed line-through'
                          : 'border-white/10 text-[var(--text-muted)] hover:border-[var(--copper-main)] hover:text-[var(--copper-light)]'
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-3">
                Quantity
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-white/10 rounded">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm text-[var(--text-light)]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(currentInventory, q + 1))}
                    disabled={quantity >= currentInventory}
                    className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                {currentInventory <= 5 && currentInventory > 0 && (
                  <p className="text-xs text-amber-400">Only {currentInventory} left</p>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <Button
                variant="copper"
                size="lg"
                fullWidth
                onClick={handleAddToCart}
                loading={adding}
                disabled={currentInventory === 0}
              >
                {added ? (
                  <>
                    <Check size={16} /> Added to Cart
                  </>
                ) : currentInventory === 0 ? (
                  'Sold Out'
                ) : (
                  <>
                    <ShoppingBag size={16} /> Add to Cart
                  </>
                )}
              </Button>

              <button
                onClick={() => toggle(product.productId)}
                className={cn(
                  'w-12 h-12 rounded border flex items-center justify-center transition-all flex-shrink-0',
                  isWishlisted
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'border-white/10 text-[var(--text-muted)] hover:border-[var(--copper-main)] hover:text-[var(--copper-light)]'
                )}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={handleShare}
                className="w-12 h-12 rounded border border-white/10 flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--copper-main)] hover:text-[var(--copper-light)] transition-all flex-shrink-0"
                aria-label="Share product"
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Delivery Info */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              {[
                { icon: Truck, text: 'Free delivery on orders above ₹999' },
                { icon: RotateCcw, text: '7-day easy returns & exchanges' },
                { icon: Shield, text: 'Authentic product with serial verification' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <Icon size={14} className="text-[var(--copper-light)] flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-3">
                Description
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-[var(--text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customer Reviews */}
        <ReviewSection productId={product.productId} />

        {/* Similar Products — hidden if fewer than 2 */}
        <SimilarProducts products={similar} />
      </div>
    </div>
  );
}
