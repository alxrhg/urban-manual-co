/**
 * Skeleton loading component for destination cards
 * Matches the exact layout of destination cards for seamless transition
 * Uses subtle shimmer animation for polished loading experience
 */

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

export function DestinationCardSkeleton() {
  return (
    <div className="group w-full flex flex-col">
      {/* Image skeleton - aspect-video to match actual cards */}
      <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl mb-3 overflow-hidden">
        <ShimmerOverlay />
      </div>

      {/* Title skeleton */}
      <div className="space-y-1.5">
        <div className="relative h-4 bg-neutral-100 dark:bg-neutral-800/60 rounded-md w-3/4 overflow-hidden">
          <ShimmerOverlay />
        </div>

        {/* Micro description skeleton */}
        <div className="relative h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-md w-2/3 overflow-hidden">
          <ShimmerOverlay />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for initial loading state
 * Uses staggered animation delays for polished cascade effect
 */
export function DestinationGridSkeleton({ count = 21 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
        >
          <DestinationCardSkeleton />
        </div>
      ))}
    </div>
  );
}
