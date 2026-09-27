/**
 * Product detail page loading skeleton.
 * Matches the dimensions of ProductDetailClient's above-the-fold layout:
 * - Left: product image gallery (aspect-[3/4])
 * - Right: product info (title, price, size selector, CTA)
 *
 * Uses fixed rem-based sizing to prevent font-size recalculations.
 * Skeleton dimensions match content dimensions to ensure CLS ≤ 0.1.
 */
export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Breadcrumb skeleton */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-10 rounded bg-muted animate-pulse" />
          <div className="h-3 w-2 rounded bg-muted animate-pulse" />
          <div className="h-3 w-12 rounded bg-muted animate-pulse" />
          <div className="h-3 w-2 rounded bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Image Gallery Skeleton */}
          <div className="space-y-4">
            {/* Main image — matches aspect-[3/4] of ProductDetailClient */}
            <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            {/* Thumbnails */}
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-16 h-20 rounded bg-muted animate-pulse flex-shrink-0" />
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="space-y-6 lg:pt-0">
            {/* Category */}
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            {/* Title */}
            <div className="h-7 w-3/4 rounded bg-muted animate-pulse" />
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
            {/* Price */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-24 rounded bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
            </div>
            {/* Tax note */}
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />

            {/* Color variants */}
            <div className="space-y-3">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                ))}
              </div>
            </div>

            {/* Size selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-12 h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-3">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-10 w-32 rounded bg-muted animate-pulse" />
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <div className="flex-1 h-12 rounded bg-muted animate-pulse" />
              <div className="w-12 h-12 rounded bg-muted animate-pulse" />
              <div className="w-12 h-12 rounded bg-muted animate-pulse" />
            </div>

            {/* Delivery info */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-muted animate-pulse flex-shrink-0" />
                  <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
