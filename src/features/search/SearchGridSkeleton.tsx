'use client';

/**
 * Shimmer effect overlay for skeleton elements
 */
function ShimmerOverlay() {
  return (
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
      style={{
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      }}
    />
  );
}

/**
 * Skeleton card matching destination card layout
 */
function CardSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Image skeleton - aspect-video to match actual cards */}
      <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl mb-3 overflow-hidden">
        <ShimmerOverlay />
      </div>
      {/* Title skeleton */}
      <div className="relative h-4 bg-neutral-100 dark:bg-neutral-800/60 rounded-md w-3/4 mb-1.5 overflow-hidden">
        <ShimmerOverlay />
      </div>
      {/* Description skeleton */}
      <div className="relative h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-md w-2/3 overflow-hidden">
        <ShimmerOverlay />
      </div>
    </div>
  );
}

export default function SearchGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="relative h-6 w-40 bg-neutral-100 dark:bg-neutral-800/60 rounded-md overflow-hidden">
          <ShimmerOverlay />
        </div>
        <div className="relative h-6 w-20 bg-neutral-100 dark:bg-neutral-800/60 rounded-md overflow-hidden">
          <ShimmerOverlay />
        </div>
      </div>

      {/* Grid skeleton with staggered animations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
          >
            <CardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
