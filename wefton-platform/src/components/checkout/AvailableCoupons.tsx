'use client';

// ============================================================
// Wefton Copper — Available coupons
// Lists the coupons every customer can use right now (flag 'S', enabled,
// inside their dates) so they can tap one to apply it. Used in the cart
// drawer and the checkout order summary.
// ============================================================
import { useEffect, useState } from 'react';
import { Tag, Check } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { getAvailableCoupons } from '@/services/couponService';
import { couponSavings, formatCouponDiscount, formatCouponEnd, pickAvailableCoupons } from '@/lib/coupons';
import { formatPrice } from '@/lib/utils';
import type { Coupon } from '@/types';

export default function AvailableCoupons({ className = '' }: { className?: string }) {
  const { items, couponCode, applyCoupon, removeCoupon } = useCartStore();
  // Set by the product-serial offer (₹120). One offer per order, so a coupon replaces it.
  const offerSerial = useCartStore((s) => (s as { offerSerial?: string }).offerSerial ?? '');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [applying, setApplying] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAvailableCoupons()
      .then((list) => {
        if (!cancelled) setCoupons(list);
      })
      .catch(() => {
        /* offline or Firebase not set up: the list just stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const available = pickAvailableCoupons(coupons, items);
  if (available.length === 0) return null;

  const handleApply = async (code: string) => {
    setApplying(code);
    try {
      await applyCoupon(code);
    } finally {
      setApplying('');
    }
  };

  return (
    <div className={className}>
      <p className="text-[10px] tracking-widest uppercase text-[var(--text-muted)] mb-2">
        Available offers
      </p>
      {offerSerial && (
        <p className="text-[10px] text-[var(--text-muted)] mb-2">
          One offer per order: applying a coupon replaces your serial offer.
        </p>
      )}
      <ul className="space-y-2" aria-label="Available coupons">
        {available.map((coupon, i) => {
          const applied = couponCode === coupon.code;
          const savings = couponSavings(coupon, items);
          const ends = formatCouponEnd(coupon.expiresAt);
          return (
            <li
              key={coupon.couponId}
              className={`flex items-center gap-3 rounded border border-dashed px-3 py-2 text-xs transition-colors ${
                applied
                  ? 'border-emerald-400/60 bg-emerald-400/5'
                  : 'border-[var(--copper-main)]/50 bg-white/5'
              }`}
            >
              <Tag size={14} className="flex-shrink-0 text-[var(--copper-light)]" />
              <div className="flex-1 min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 text-[var(--text-light)]">
                  <span className="font-mono font-medium tracking-wider">{coupon.code}</span>
                  <span className="text-[var(--copper-light)]">{formatCouponDiscount(coupon)} off</span>
                  {i === 0 && available.length > 1 && !applied && (
                    <span className="rounded bg-[var(--copper-main)] px-1.5 py-px text-[9px] uppercase tracking-wider text-white">
                      Best offer
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {savings > 0 ? `You save ${formatPrice(savings)}` : 'Add items to see your saving'}
                  {ends ? ` · ${ends}` : ''}
                </p>
              </div>
              {applied ? (
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="flex items-center gap-1 text-emerald-400 hover:text-red-400"
                  aria-label={`Remove coupon ${coupon.code}`}
                >
                  <Check size={12} /> Applied
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!!applying}
                  onClick={() => handleApply(coupon.code)}
                  className="h-7 px-3 text-[10px] tracking-wider uppercase border border-[var(--copper-main)] rounded text-[var(--copper-light)] hover:bg-[var(--copper-main)] hover:text-white transition-colors disabled:opacity-50"
                >
                  {applying === coupon.code ? '...' : 'Apply'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
