'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export default function StarRating({
  rating,
  max = 5,
  size = 14,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              'relative',
              interactive && 'cursor-pointer hover:scale-110 transition-transform'
            )}
            aria-label={`${i + 1} star`}
          >
            <Star
              size={size}
              className={cn(
                filled
                  ? 'fill-[var(--copper-light)] text-[var(--copper-light)]'
                  : partial
                  ? 'fill-[var(--copper-light)]/50 text-[var(--copper-light)]'
                  : 'fill-transparent text-[var(--text-faint)]'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
