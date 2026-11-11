'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Ticket,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '@/services/couponService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import type { Coupon } from '@/types';
import {
  couponWindow,
  formatCouponDiscount,
  istDayEnd,
  istDayStart,
  toIstDateInput,
  validateCouponForm,
} from '@/lib/coupons';

// ============================================================
// Coupon Form Modal (inline — Create / Edit)
// ============================================================

interface CouponFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCoupon: Coupon | null;
}

const FIELD =
  'w-full h-9 px-3 rounded bg-[var(--wc-canvas)] border border-[var(--wc-line)] text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)] disabled:opacity-50 disabled:cursor-not-allowed';
const LABEL = 'block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider';

function CouponFormModal({ open, onClose, onSuccess, editingCoupon }: CouponFormProps) {
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rupees, setRupees] = useState('');
  const [percent, setPercent] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCode(editingCoupon?.code ?? '');
    setStartDate(toIstDateInput(editingCoupon?.startsAt));
    setEndDate(toIstDateInput(editingCoupon?.expiresAt));
    setRupees(editingCoupon?.discountFlat ? String(editingCoupon.discountFlat) : '');
    setPercent(editingCoupon?.discount ? String(editingCoupon.discount) : '');
    setActive(editingCoupon?.active ?? true);
    setError('');
  }, [editingCoupon, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const problem = validateCouponForm({ code, startDate, endDate, rupees, percent });
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      const values = {
        discount: percent ? Number(percent) : 0,
        discountFlat: rupees ? Number(rupees) : 0,
        active,
        startsAt: istDayStart(startDate),
        expiresAt: istDayEnd(endDate),
      };
      if (editingCoupon) {
        await updateCoupon(editingCoupon.couponId, values);
      } else {
        await createCoupon({ code: code.trim().toUpperCase(), ...values });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-[90vw] max-w-md bg-[var(--wc-surface)] text-[var(--text-light)] border border-[var(--wc-line)] rounded-lg shadow-xl p-6">
        <h3 className="text-base font-medium text-[var(--text-light)] mb-4">
          {editingCoupon ? 'Edit Offer' : 'Create Offer'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="coupon-code" className={LABEL}>Coupon ID *</label>
            <input
              id="coupon-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={!!editingCoupon}
              maxLength={20}
              placeholder="e.g. SUMMER25"
              className={`${FIELD} font-mono`}
            />
            <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
              {editingCoupon
                ? 'The Coupon ID cannot be changed after creation'
                : 'Letters and numbers only. Customers can type it in upper or lower case.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-start" className={LABEL}>Start date *</label>
              <input id="coupon-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="coupon-end" className={LABEL}>End date *</label>
              <input id="coupon-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={FIELD} />
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="coupon-rupees" className={LABEL}>Discount (₹)</label>
                <input
                  id="coupon-rupees"
                  type="number"
                  min={1}
                  value={rupees}
                  onChange={(e) => setRupees(e.target.value)}
                  disabled={!!percent}
                  placeholder="e.g. 100"
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="coupon-percent" className={LABEL}>Discount (%)</label>
                <input
                  id="coupon-percent"
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  disabled={!!rupees}
                  placeholder="1–100"
                  className={FIELD}
                />
              </div>
            </div>
            <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
              Fill in one of these. Clear it to use the other.
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Enabled
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label="Enabled"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                active ? 'bg-emerald-500' : 'bg-black/20'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  active ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="copper" size="sm" loading={loading}>
              {editingCoupon ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Status shown in the table. */
function couponBadge(coupon: Coupon): { label: string; variant: 'success' | 'error' | 'warning' } {
  if (!coupon.active) return { label: 'Disabled', variant: 'error' };
  const window = couponWindow(coupon);
  if (window === 'expired') return { label: 'Expired', variant: 'error' };
  if (window === 'scheduled') return { label: 'Scheduled', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
}

// ============================================================
// Sort State
// ============================================================

type SortField = 'code' | 'discount' | 'expiresAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, currentField, currentDir }: { field: SortField; currentField: SortField; currentDir: SortDir }) {
  if (field !== currentField) {
    return <ArrowUp size={12} className="opacity-30" />;
  }
  return currentDir === 'asc' ? (
    <ArrowUp size={12} className="text-[var(--copper-light)]" />
  ) : (
    <ArrowDown size={12} className="text-[var(--copper-light)]" />
  );
}

// ============================================================
// Main CouponsTab Component
// ============================================================

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCoupons(sortField, sortDir);
      setCoupons(data);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCoupon(deleteTarget.couponId);
      setCoupons((prev) => prev.filter((c) => c.couponId !== deleteTarget.couponId));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      alert('Failed to delete coupon. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (raw: unknown) => {
    const date = toIstDateInput(raw);
    if (!date) return '—';
    return new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[var(--text-light)]">
          Offers ({coupons.length})
        </h2>
        <Button variant="copper" size="sm" onClick={handleCreate}>
          <Plus size={14} /> Create Offer
        </Button>
      </div>

      {/* Empty state */}
      {coupons.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Ticket size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)] mb-4">No offers yet</p>
          <Button variant="copper" onClick={handleCreate}>
            <Plus size={14} /> Create First Offer
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_90px_90px_110px_110px_80px] gap-3 px-4 py-2 text-[10px] font-medium tracking-wider uppercase text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => handleSort('code')}
              className="flex items-center gap-1 hover:text-[var(--text-light)] transition-colors text-left"
            >
              Coupon ID
              <SortIcon field="code" currentField={sortField} currentDir={sortDir} />
            </button>
            <button
              type="button"
              onClick={() => handleSort('discount')}
              className="flex items-center gap-1 hover:text-[var(--text-light)] transition-colors text-left"
            >
              Discount
              <SortIcon field="discount" currentField={sortField} currentDir={sortDir} />
            </button>
            <span>Status</span>
            <span>Starts</span>
            <button
              type="button"
              onClick={() => handleSort('expiresAt')}
              className="flex items-center gap-1 hover:text-[var(--text-light)] transition-colors text-left"
            >
              Ends
              <SortIcon field="expiresAt" currentField={sortField} currentDir={sortDir} />
            </button>
            <span>Actions</span>
          </div>

          {/* Coupon rows */}
          {coupons.map((coupon) => (
            <div
              key={coupon.couponId}
              className="glass-card p-4 md:grid md:grid-cols-[minmax(0,1fr)_90px_90px_110px_110px_80px] md:gap-3 md:items-center"
            >
              {/* Code */}
              <div>
                <p className="text-sm text-[var(--text-light)] font-mono font-medium">
                  {coupon.code}
                </p>
              </div>

              {/* Discount */}
              <span className="text-xs text-[var(--copper-light)]">
                {formatCouponDiscount(coupon)}
              </span>

              {/* Active Status */}
              <div>
                <Badge variant={couponBadge(coupon).variant}>{couponBadge(coupon).label}</Badge>
              </div>

              {/* Dates */}
              <span className="text-xs text-[var(--text-muted)]">{formatDate(coupon.startsAt)}</span>
              <span className="text-xs text-[var(--text-muted)]">{formatDate(coupon.expiresAt)}</span>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => handleEdit(coupon)}
                  className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                  title="Edit offer"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(coupon)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  title="Delete offer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Form Modal */}
      <CouponFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchCoupons}
        editingCoupon={editingCoupon}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Offer"
        description={`Are you sure you want to delete coupon "${deleteTarget?.code}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
