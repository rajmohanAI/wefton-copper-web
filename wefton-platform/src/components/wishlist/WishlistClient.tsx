'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { getProductById } from '@/services/productService';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import StarRating from '@/components/ui/StarRating';
import Badge from '@/components/ui/Badge';
import type { Product } from '@/types';

export default function WishlistClient() {
  const { items, toggle, syncFromFirestore } = useWishlistStore();
  const { addItem, openCart } = useCartStore();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  // Sync wishlist from Firestore for authenticated users
  useEffect(() => {
    if (user?.uid) {
      syncFromFirestore(user.uid);
    }
  }, [user?.uid, syncFromFirestore]);

  // Resolve full Product documents from Firestore
  useEffect(() => {
    if (items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(items.map((id) => getProductById(id)))
      .then((results) => setProducts(results.filter(Boolean) as Product[]))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [items]);

  const handleRemoveFromWishlist = async (productId: string) => {
    setRemovingIds((prev) => new Set(prev).add(productId));
    await toggle(productId, user?.uid);
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleAddToCart = (product: Product) => {
    if (product.inventory === 0) return;
    setAddingIds((prev) => new Set(prev).add(product.productId));
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
    setTimeout(() => {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.productId);
        return next;
      });
    }, 800);
  };

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Header */}
      <div className="bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] py-12 px-6">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-4xl font-light text-[var(--copper-light)] flex items-center gap-3">
            <Heart size={32} /> Wishlist
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">
            {items.length} {items.length === 1 ? 'saved item' : 'saved items'}
          </p>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-12">
        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <Heart size={48} className="text-[var(--text-faint)] mx-auto mb-4" />
            <h2 className="text-xl text-[var(--text-light)] mb-2">Your wishlist is empty</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Save items you love to your wishlist and find them here anytime.
            </p>
            <Link href="/">
              <Button variant="copper">Browse Products</Button>
            </Link>
          </div>
        ) : (
          /* Wishlist Grid */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {products.map((product) => {
                const isOutOfStock = product.inventory === 0;
                const isRemoving = removingIds.has(product.productId);
                const isAdding = addingIds.has(product.productId);
                const primaryImage = product.images?.[0];

                return (
                  <motion.div
                    key={product.productId}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="group relative flex flex-col bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg overflow-hidden"
                  >
                    {/* Product Image */}
                    <Link href={`/products/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={primaryImage.alt || product.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--bg-darker)] flex items-center justify-center">
                          <Heart size={32} className="text-[var(--text-faint)]" />
                        </div>
                      )}

                      {/* Out of Stock Badge */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                          <Badge variant="error">Out of Stock</Badge>
                        </div>
                      )}

                      {/* Product Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
                        {product.newArrival && <Badge variant="copper">New</Badge>}
                        {product.bestseller && <Badge variant="success">Bestseller</Badge>}
                        {product.comparePrice && product.comparePrice > product.price && (
                          <Badge variant="warning">
                            {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}% OFF
                          </Badge>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex flex-col flex-1 p-4">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="text-sm text-[var(--text-light)] group-hover:text-[var(--copper-light)] transition-colors line-clamp-2">
                          {product.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-[var(--text-muted)] mt-1 capitalize">{product.category}</p>

                      {/* Price */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-medium text-[var(--copper-light)]">
                          {formatPrice(product.price)}
                        </span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <span className="text-xs text-[var(--text-faint)] line-through">
                            {formatPrice(product.comparePrice)}
                          </span>
                        )}
                      </div>

                      {/* Rating */}
                      {product.reviewsCount > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <StarRating rating={product.ratings} size={11} />
                          <span className="text-[10px] text-[var(--text-muted)]">
                            ({product.reviewsCount})
                          </span>
                        </div>
                      )}

                      {/* Availability */}
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

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-auto pt-4">
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock || isAdding}
                          className="flex-1 h-9 flex items-center justify-center gap-2 rounded text-xs tracking-wider uppercase font-medium transition-all duration-200 bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)] disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={isOutOfStock ? 'Out of Stock' : `Add ${product.title} to cart`}
                        >
                          {isAdding ? (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : (
                            <ShoppingBag size={13} />
                          )}
                          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>

                        <button
                          onClick={() => handleRemoveFromWishlist(product.productId)}
                          disabled={isRemoving}
                          className="w-9 h-9 flex items-center justify-center rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Remove ${product.title} from wishlist`}
                        >
                          {isRemoving ? (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
