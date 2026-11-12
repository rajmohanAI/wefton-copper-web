'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import { reviewSchema } from '@/lib/schemas';
import { addReview } from '@/services/reviewService';
import type { User } from '@/types';

export interface ReviewTarget {
  productId: string;
  title: string;
}

/** Rate and review one product from a delivered order. Shows on the product page as a verified review. */
export default function OrderReviewDialog({
  target,
  user,
  onClose,
  onReviewed,
}: {
  target: ReviewTarget | null;
  user: User;
  onClose: () => void;
  onReviewed: (productId: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(0);
    setComment('');
    setError('');
  }, [target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const parsed = reviewSchema.safeParse({ rating, comment });
    if (!parsed.success) {
      setError(rating === 0 ? 'Please choose a star rating.' : parsed.error.issues[0].message);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await addReview({
        productId: target.productId,
        userId: user.uid,
        userName: user.name || 'Anonymous',
        ...(user.avatar ? { userAvatar: user.avatar } : {}),
        rating,
        comment,
        verified: true,
      });
      onReviewed(target.productId);
      onClose();
    } catch (err) {
      console.error('[Orders] Could not save review:', err);
      setError('Could not save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={!!target} onOpenChange={(open) => !open && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[var(--wc-surface)] text-[var(--text-light)] border border-[var(--wc-line)] rounded-lg shadow-xl z-[60] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-medium">Rate and review</Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--text-muted)] mt-1 truncate">{target?.title}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)]" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <form onSubmit={submit} className="space-y-4 mt-5">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5">Your rating</p>
              <StarRating rating={rating} size={26} interactive onChange={setRating} />
            </div>
            <div>
              <label htmlFor="order-review" className="text-xs text-[var(--text-muted)] block mb-1.5">
                Your review
              </label>
              <textarea
                id="order-review"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="How was the fit, fabric and feel?"
                className="w-full rounded bg-[var(--wc-canvas)] border border-[var(--wc-line)] p-3 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="copper" size="sm" loading={submitting} disabled={submitting}>
                Submit review
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
