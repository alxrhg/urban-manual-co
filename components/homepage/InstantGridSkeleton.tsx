/**
 * Instant Grid Skeleton
 *
 * A pure server-component skeleton that renders immediately as part of the static shell.
 * No 'use client' directive - zero JavaScript overhead.
 *
 * Uses CSS animations (no JS) for the loading effect.
 * Matches the exact layout of the destination grid for seamless transition.
 */

interface InstantGridSkeletonProps {
  /** Number of skeleton cards to show (default: 21 for 3 rows on 7-col grid) */
  count?: number;
}

/**
 * Single skeleton card - pure CSS, no JS
 */
function SkeletonCard() {
  return (
    <div className="w-full">
      {/* Image skeleton with shimmer */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl mb-3 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-1.5">
        <div className="relative h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Description skeleton */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for instant loading state
 *
 * Renders as part of the static shell - visible immediately on page load.
 */
export function InstantGridSkeleton({ count = 21 }: InstantGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-7 lg:gap-8 items-start">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Full homepage skeleton including hero and filters
 *
 * This is the complete skeleton shown while the page is loading.
 * Renders entirely on the server - no JavaScript required.
 */
export function HomepageSkeleton() {
  return (
    <main className="w-full min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl">
            {/* Greeting skeleton */}
            <div className="space-y-3 mb-8">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
            </div>

            {/* Search input skeleton */}
            <div className="h-12 w-full max-w-xl bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse mb-8" />

            {/* City filter skeleton */}
            <div className="flex flex-wrap gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-6 w-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"
                />
              ))}
            </div>

            {/* Category filter skeleton */}
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-6 w-20 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="w-full px-6 md:px-10 mt-8">
        <div className="max-w-[1800px] mx-auto">
          {/* Navigation bar skeleton */}
          <div className="flex justify-end gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-11 w-24 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse"
              />
            ))}
          </div>

          {/* Grid skeleton */}
          <InstantGridSkeleton count={21} />
        </div>
      </div>
    </main>
  );
}

export default InstantGridSkeleton;
