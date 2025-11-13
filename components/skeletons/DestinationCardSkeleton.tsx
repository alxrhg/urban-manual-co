/**
 * Skeleton loading component for destination cards
 * Matches the exact layout of destination cards for seamless transition
 */
export function DestinationCardSkeleton() {
  return (
    <div className="group w-full animate-pulse">
      {/* Image skeleton */}
      <div className="relative mb-3 aspect-video overflow-hidden rounded-2xl border border-gray-100 bg-gray-200 dark:border-gray-800 dark:bg-gray-800">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-0.5">
        <div className="relative mb-2 h-4 min-h-[2.5rem] w-3/4 rounded bg-gray-200 dark:bg-gray-800">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Micro description skeleton */}
        <div className="relative h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800">
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
