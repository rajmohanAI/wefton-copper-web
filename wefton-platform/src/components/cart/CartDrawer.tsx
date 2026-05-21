'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, Trash2, Tag, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModalStore } from '@/store/authModalStore';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { FREE_SHIPPING_THRESHOLD } from '@/config/brand';

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    getSubtotal,
    getShipping,
    getTax,
    getTotal,
    couponCode,
    discount,
    couponError,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const { user } = useAuth();
  const { openModal } = useAuthModalStore();
  const router = useRouter();
  const [couponLoading, setCouponLoading] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const subtotal = getSubtotal();
  const shipping = getShipping();
  const freeShippingRemaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const freeShippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  const handleApplyCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem('coupon') as HTMLInputElement;
    if (input.value.trim()) {
      setCouponLoading(true);
      await applyCoupon(input.value.trim());
      setCouponLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      // Open AuthModal if not authenticated
      openModal();
      return;
    }
    closeCart();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass border-l border-[var(--glass-border)] flex flex-col"
            role="dialog"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[var(--copper-light)]" />
                <h2 className="text-sm font-medium tracking-widest uppercase text-[var(--text-light)]">
                  Your Cart
                </h2>
                {items.length > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">({items.length})</span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Free shipping progress */}
            {items.length > 0 && (
              <div className="px-6 py-3 bg-[var(--copper-main)]/10 border-b border-[var(--border-subtle)]">
                {isFreeShipping ? (
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-emerald-400" />
                    <p className="text-xs font-medium text-emerald-400">
                      Free shipping unlocked!
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[var(--copper-light)]">
                      Add {formatPrice(freeShippingRemaining)} more for free shipping
                    </p>
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--copper-main)] rounded-full transition-all duration-500"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <ShoppingBag size={48} className="text-[var(--text-faint)]" />
                  <p className="text-[var(--text-muted)] text-sm">Your cart is empty</p>
                  <Button variant="outline" size="sm" onClick={closeCart}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                items.map((item) => {
                  const isAtMax = item.quantity >= item.inventory;
                  return (
                    <motion.div
                      key={item.variantId || item.productId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-4 pb-4 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      {/* Image */}
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={closeCart}
                        className="relative w-20 h-24 rounded overflow-hidden bg-[var(--bg-darker)] flex-shrink-0"
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm text-[var(--text-light)] hover:text-[var(--copper-light)] transition-colors line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {item.size && (
                            <span className="text-xs text-[var(--text-muted)]">
                              Size: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="text-xs text-[var(--text-muted)]">
                              · {item.color}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[var(--copper-light)] mt-1">
                          {formatPrice(item.price)}
                        </p>

                        {/* Quantity + Remove */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 border border-white/10 rounded">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                  item.variantId
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs w-5 text-center text-[var(--text-light)]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                  item.variantId
                                )
                              }
                              disabled={isAtMax}
                              className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="text-[var(--text-faint)] hover:text-red-400 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Max quantity reached message */}
                        {isAtMax && (
                          <p className="text-[10px] text-amber-400 mt-1">
                            Max quantity reached
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-[var(--border-subtle)] space-y-4">
                {/* Coupon */}
                {!couponCode ? (
                  <div>
                    <form className="flex gap-2" onSubmit={handleApplyCoupon}>
                      <div className="relative flex-1">
                        <Tag
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        />
                        <input
                          name="coupon"
                          placeholder="Coupon code"
                          className="w-full h-9 pl-8 pr-3 bg-white/5 border border-white/10 rounded text-xs text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={couponLoading}
                        className="h-9 px-4 text-xs tracking-wider uppercase bg-white/5 border border-white/10 rounded text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors disabled:opacity-50"
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </form>
                    {/* Inline coupon error */}
                    {couponError && (
                      <p className="text-[11px] text-red-400 mt-1.5">{couponError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Tag size={12} /> {couponCode} — {discount}% off
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="text-[var(--text-muted)] hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({discount}%)</span>
                      <span>-{formatPrice((subtotal * discount) / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>GST (5%)</span>
                    <span>{formatPrice(getTax())}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-[var(--text-light)] pt-2 border-t border-[var(--border-subtle)]">
                    <span>Total</span>
                    <span className="text-[var(--copper-light)]">
                      {formatPrice(getTotal())}
                    </span>
                  </div>
                </div>

                {/* Proceed to Checkout */}
                <Button
                  variant="copper"
                  fullWidth
                  size="lg"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Checkout
                </Button>

                <button
                  onClick={closeCart}
                  className="w-full text-xs text-center text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
