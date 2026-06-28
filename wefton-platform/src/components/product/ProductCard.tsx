'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, getDiscountPercent, cn } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import Badge from '@/components/ui/Badge';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { addItem, openCart } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const isWishlisted = has(product.productId);
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);
  const isOutOfStock = product.inventory === 0;
  const images = product.images || [];
  const currentImage = images[currentImageIndex] || images[0];
  const hasMultipleImages = images.length > 1;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((i) => (i - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((i) => (i + 1) % images.length);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setAdding(true);
    addItem({
      productId: product.productId,
      title: product.title,
      slug: product.slug,
      image: images[0]?.url || '/placeholder.jpg',
      price: product.price,
      quantity: 1,
      inventory: product.inventory,
    });
    openCart();
    setTimeout(() => setAdding(false), 800);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.productId);
  };

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
      style={{ opacity: 1, transform: 'none' }}
    >
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-lg bg-[var(--bg-darker)] aspect-[3/4]">
          {/* Current Image */}
          {currentImage && (
            <Image
              src={currentImage.url}
              alt={currentImage.alt || product.title}
              fill
              priority={priority}
              className="object-cover transition-opacity duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={90}
              key={currentImageIndex}
            />
          )}

          {/* Prev/Next Navigation Arrows */}
          {hasMultipleImages && hovered && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all z-20"
                aria-label="Previous image"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all z-20"
                aria-label="Next image"
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}

          {/* Image dots indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === currentImageIndex ? 'bg-white' : 'bg-white/40'
                  )}
                />
              ))}
            </div>
          )}

          {/* Hover gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200",
              hovered ? "opacity-100" : "opacity-0"
            )}
          />

          {/* Out of Stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <span className="text-white text-sm font-semibold tracking-wider uppercase px-4 py-2 bg-black/70 rounded">
                Out of Stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
            {product.newArrival && <Badge variant="copper">New</Badge>}
            {product.bestseller && <Badge variant="success">Bestseller</Badge>}
            {discount > 0 && <Badge variant="warning">{discount}% OFF</Badge>}
          </div>

          {/* Wishlist icon toggle */}
          <button
            onClick={handleWishlist}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-20',
              'bg-black/40 backdrop-blur-sm border border-white/10',
              isWishlisted
                ? 'text-red-400 border-red-400/30'
                : 'text-white/60 hover:text-red-400 hover:border-red-400/30'
            )}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Actions on hover */}
          <div
            className={cn(
              "absolute bottom-3 left-3 right-3 flex gap-2 z-20 transition-all duration-200",
              hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[10px]"
            )}
          >
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || adding}
              className={cn(
                'flex-1 h-9 flex items-center justify-center gap-2 rounded text-xs tracking-wider uppercase font-medium transition-all duration-200',
                'bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {adding ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <ShoppingBag size={13} />
              )}
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <Link
              href={`/products/${product.slug}`}
              className="w-9 h-9 flex items-center justify-center rounded bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
              aria-label="Quick view"
            >
              <Eye size={14} />
            </Link>
          </div>
        </div>

        {/* Product Info */}
        <div className="mt-3 px-1">
          <h3 className="text-sm text-[var(--text-light)] group-hover:text-[var(--copper-light)] transition-colors truncate">
            {product.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{product.category}</p>

          <div className="flex items-center justify-between mt-2">
            {/* Price display */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--copper-light)]">
                {formatPrice(product.price)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-xs text-[var(--text-faint)] line-through">
                  {formatPrice(product.comparePrice)}
                </span>
              )}
            </div>

            {/* Rating stars and review count */}
            {product.reviewsCount > 0 && (
              <div className="flex items-center gap-1">
                <StarRating rating={product.ratings} size={11} />
                <span className="text-[10px] text-[var(--text-muted)]">({product.reviewsCount})</span>
              </div>
            )}
          </div>

          {/* Availability status */}
          <div className="mt-1.5">
            {isOutOfStock ? (
              <span className="text-[10px] text-red-400 font-medium uppercase tracking-wide">
                Out of Stock
              </span>
            ) : product.inventory <= 5 ? (
              <span className="text-[10px] text-amber-400 font-medium">
                Only {product.inventory} left
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-medium">
                In Stock
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
