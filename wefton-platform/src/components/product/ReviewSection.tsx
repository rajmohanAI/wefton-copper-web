'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, CheckCircle, Loader2 } from 'lucide-react';
import { getProductReviews, addReview, markHelpful } from '@/services/reviewService';
import { getUserOrders } from '@/services/orderService';
import { reviewSchema } from '@/lib/schemas';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModalStore } from '@/store/authModalStore';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Review } from '@/types';

interface ReviewSectionProps {
  productId: string;
}

const PAGE_SIZE = 5;

// ── Helpers ──────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Aggregate Rating Component ───────────────────────────────

function AggregateRating({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  const total = reviews.length;
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 p-6 rounded-xl bg-white/[0.02] border border-[var(--border-subtle)]">
      {/* Average */}
      <div className="flex flex-col items-center justify-center gap-1 min-w-[120px]">
        <span className="text-4xl font-light text-[var(--text-light)]">
          {average.toFixed(1)}
        </span>
        <StarRating rating={average} size={16} />
        <span className="text-xs text-[var(--text-muted)] mt-1">
          {total} {total === 1 ? 'review' : 'reviews'}
        </span>
      </div>

      {/* Star Distribution Bar Chart */}
      <div className="flex-1 space-y-2">
        {distribution.map(({ star, count }) => {
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)] w-8 text-right">
                {star}★
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--copper-light)] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] w-8">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Single Review Card ───────────────────────────────────────

function ReviewCard({
  review,
  onHelpful,
}: {
  review: Review;
  onHelpful: (reviewId: string) => void;
}) {
  const [helpfulClicked, setHelpfulClicked] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful);

  const handleHelpful = () => {
    if (helpfulClicked) return;
    setHelpfulClicked(true);
    setHelpfulCount((c) => c + 1);
    onHelpful(review.reviewId);
  };

  return (
    <div className="py-5 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {review.userAvatar ? (
          <img
            src={review.userAvatar}
            alt={review.userName}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[var(--copper-main)]/20 flex items-center justify-center text-xs font-medium text-[var(--copper-light)] flex-shrink-0">
            {getInitials(review.userName)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--text-light)]">
              {review.userName}
            </span>
            {review.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle size={10} />
                Verified Purchase
              </span>
            )}
            <span className="text-[10px] text-[var(--text-faint)] ml-auto">
              {getRelativeTime(review.createdAt)}
            </span>
          </div>

          {/* Stars */}
          <div className="mt-1">
            <StarRating rating={review.rating} size={12} />
          </div>

          {/* Comment */}
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            {review.comment}
          </p>

          {/* Helpful */}
          <button
            onClick={handleHelpful}
            disabled={helpfulClicked}
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 text-xs transition-colors',
              helpfulClicked
                ? 'text-[var(--copper-light)] cursor-default'
                : 'text-[var(--text-faint)] hover:text-[var(--copper-light)]'
            )}
          >
            <ThumbsUp size={12} />
            Helpful{helpfulCount > 0 && ` (${helpfulCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Submission Form ───────────────────────────────────

function ReviewForm({
  productId,
  onSubmitted,
}: {
  productId: string;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const { openModal } = useAuthModalStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  // Check if user has purchased this product
  useEffect(() => {
    async function checkPurchase() {
      if (!user) {
        setHasPurchased(false);
        return;
      }
      try {
        const orders = await getUserOrders(user.uid);
        const purchased = orders.some(
          (order) =>
            order.paymentStatus === 'verified' &&
            order.products.some((p) => p.productId === productId)
        );
        setHasPurchased(purchased);
      } catch {
        setHasPurchased(false);
      }
    }
    checkPurchase();
  }, [user, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Auth check — open AuthModal if not signed in, preserve form
    if (!user) {
      openModal();
      return;
    }

    // Validate with Zod
    const result = reviewSchema.safeParse({ rating, comment });
    if (!result.success) {
      const fieldErrors: { rating?: string; comment?: string } = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as 'rating' | 'comment';
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await addReview({
        productId,
        userId: user.uid,
        userName: user.name || 'Anonymous',
        userAvatar: user.avatar,
        rating,
        comment,
        verified: hasPurchased,
      });
      // Reset form
      setRating(0);
      setComment('');
      onSubmitted();
    } catch (err) {
      console.error('[ReviewSection] Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="text-sm font-medium text-[var(--text-light)]">Write a Review</h4>

      {/* Rating */}
      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1.5">
          Your Rating
        </label>
        <StarRating
          rating={rating}
          size={22}
          interactive
          onChange={setRating}
        />
        {errors.rating && (
          <p className="text-xs text-red-400 mt-1">{errors.rating}</p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="review-comment" className="text-xs text-[var(--text-muted)] block mb-1.5">
          Your Review
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product (10–500 characters)"
          rows={4}
          maxLength={500}
          className="w-full bg-white/5 border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)] resize-none transition-colors"
        />
        <div className="flex justify-between mt-1">
          {errors.comment ? (
            <p className="text-xs text-red-400">{errors.comment}</p>
          ) : (
            <span />
          )}
          <span className="text-[10px] text-[var(--text-faint)]">
            {comment.length}/500
          </span>
        </div>
      </div>

      <Button
        type="submit"
        variant="copper"
        size="md"
        loading={submitting}
        disabled={submitting}
      >
        Submit Review
      </Button>
    </form>
  );
}

// ── Main ReviewSection Component ─────────────────────────────

export default function ReviewSection({ productId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProductReviews(productId);
      setReviews(data);
    } catch (err) {
      console.error('[ReviewSection] Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleHelpful = async (reviewId: string) => {
    try {
      await markHelpful(reviewId);
    } catch (err) {
      console.error('[ReviewSection] Failed to mark helpful:', err);
    }
  };

  const handleReviewSubmitted = () => {
    // Re-fetch reviews to show the new one
    fetchReviews();
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = reviews.length > visibleCount;

  return (
    <section className="mt-16 pt-10 border-t border-[var(--border-subtle)]">
      <h2 className="text-lg font-light text-[var(--text-light)] tracking-wide mb-6">
        Customer Reviews
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--copper-light)]" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Aggregate Rating */}
          <AggregateRating reviews={reviews} />

          {/* Review List */}
          {visibleReviews.length > 0 ? (
            <div>
              {visibleReviews.map((review) => (
                <ReviewCard
                  key={review.reviewId}
                  review={review}
                  onHelpful={handleHelpful}
                />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                  >
                    Load More Reviews
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-4">
              No reviews yet. Be the first to share your experience!
            </p>
          )}

          {/* Review Submission Form */}
          <div className="pt-6 border-t border-[var(--border-subtle)]">
            <ReviewForm productId={productId} onSubmitted={handleReviewSubmitted} />
          </div>
        </div>
      )}
    </section>
  );
}
