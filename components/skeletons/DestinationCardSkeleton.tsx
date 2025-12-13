/**
 * Skeleton loading component for destination cards
 * Matches the exact layout of destination cards for seamless transition
 * Uses Ubiquiti-style shimmer animation for polished feel
 */
export function DestinationCardSkeleton() {
  return (
    <div className="w-full">
      {/* Image skeleton - matches aspect-video from DestinationCard */}
      <div className="aspect-video skeleton-pulse rounded-2xl mb-3" />

      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-4 skeleton-pulse rounded w-3/4" />

        {/* Micro description skeleton */}
        <div className="h-3 skeleton-pulse rounded w-2/3" />
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for initial loading state
 * Uses staggered fade-in for a polished loading experience
 */
export function DestinationGridSkeleton({ count = 28 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="stagger-item"
          style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
        >
          <DestinationCardSkeleton />
        </div>
      ))}
    </div>
  );
}
