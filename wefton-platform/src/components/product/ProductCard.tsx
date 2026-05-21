'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
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

  const { addItem, openCart } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const isWishlisted = has(product.productId);
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);
  const isOutOfStock = product.inventory === 0;
  const primaryImage = product.images?.[0];
  const secondaryImage = product.images?.[1];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setAdding(true);
    addItem({
      productId: product.productId,
      title: product.title,
      slug: product.slug,
      image: primaryImage?.url || '/placeholder.jpg',
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
    <motion.article
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative"
    >
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-lg bg-[var(--bg-darker)] aspect-[3/4]">
          {/* Primary Image */}
          {primaryImage && (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt || product.title}
              fill
              priority={priority}
              className={cn(
                'object-cover transition-all duration-700 ease-in-out',
                hovered && secondaryImage ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}

          {/* Secondary Image (hover swap with CSS transition) */}
          {secondaryImage && (
            <Image
              src={secondaryImage.url}
              alt={secondaryImage.alt || `${product.title} - alternate view`}
              fill
              className={cn(
                'object-cover transition-all duration-700 ease-in-out absolute inset-0',
                hovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}

          {/* Hover gradient overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-3 left-3 right-3 flex gap-2 z-20"
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
          </motion.div>
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
    </motion.article>
  );
}
