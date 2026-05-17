'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, getDiscountPercent } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import Badge from '@/components/ui/Badge';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);
  const [adding, setAdding] = useState(false);

  const { addItem, openCart } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const isWishlisted = has(product.productId);
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    addItem({
      productId: product.productId,
      title: product.title,
      slug: product.slug,
      image: product.images?.[0]?.url || '/placeholder.jpg',
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
      onHoverStart={() => {
        setHovered(true);
        if (product.images?.length > 1) setImageIdx(1);
      }}
      onHoverEnd={() => {
        setHovered(false);
        setImageIdx(0);
      }}
      className="group relative"
    >
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-lg bg-[var(--bg-darker)] aspect-[3/4]">
          {product.images?.[0] && (
            <Image
              src={product.images[imageIdx]?.url || product.images[0].url}
              alt={product.images[imageIdx]?.alt || product.title}
              fill
              priority={priority}
              className={cn(
                'object-cover transition-all duration-700',
                hovered ? 'scale-105' : 'scale-100'
              )}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}

          {/* Overlay on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.newArrival && <Badge variant="copper">New</Badge>}
            {product.bestseller && <Badge variant="success">Bestseller</Badge>}
            {discount > 0 && <Badge variant="warning">{discount}% Off</Badge>}
            {product.inventory === 0 && <Badge variant="error">Sold Out</Badge>}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
              'bg-black/40 backdrop-blur-sm border border-white/10',
              isWishlisted
                ? 'text-red-400 border-red-400/30'
                : 'text-white/60 hover:text-red-400 hover:border-red-400/30'
            )}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-3 left-3 right-3 flex gap-2"
          >
            <button
              onClick={handleAddToCart}
              disabled={product.inventory === 0 || adding}
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
              {product.inventory === 0 ? 'Sold Out' : 'Add to Cart'}
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

        {/* Info */}
        <div className="mt-3 px-1">
          <h3 className="text-sm text-[var(--text-light)] group-hover:text-[var(--copper-light)] transition-colors truncate">
            {product.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{product.category}</p>

          <div className="flex items-center justify-between mt-2">
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
            {product.reviewsCount > 0 && (
              <div className="flex items-center gap-1">
                <StarRating rating={product.ratings} size={11} />
                <span className="text-[10px] text-[var(--text-muted)]">({product.reviewsCount})</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
