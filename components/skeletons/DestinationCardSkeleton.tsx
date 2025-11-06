/**
 * Skeleton loading component for destination cards
 * Matches the exact layout of destination cards for seamless transition
 */
export function DestinationCardSkeleton() {
  return (
    <div className="group animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 relative overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Meta info skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
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
