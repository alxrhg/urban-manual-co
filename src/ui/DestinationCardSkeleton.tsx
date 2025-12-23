/**
 * Skeleton loading component for destination cards
 * Matches the exact layout of destination cards for seamless transition
 */
export function DestinationCardSkeleton() {
  return (
    <div className="group animate-pulse w-full">
      {/* Image skeleton */}
      <div className="aspect-video bg-[var(--editorial-border)] rounded-2xl mb-3 relative overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-0.5">
        <div className="h-4 bg-[var(--editorial-border)] rounded w-3/4 mb-2 relative overflow-hidden min-h-[2.5rem]">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Micro description skeleton */}
        <div className="h-3 bg-[var(--editorial-border)] rounded w-2/3 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for initial loading state
 */
export function DestinationGridSkeleton({ count = 28 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
      {Array.from({ length: count }).map((_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}
