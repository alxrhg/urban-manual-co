/**
 * Instant Grid Skeleton - Apple Design System
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
 * Single skeleton card - Apple-style subtle pulse
 */
function SkeletonCard() {
  return (
    <div className="w-full">
      {/* Image skeleton - Apple-style rounded corners */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800/50 rounded-[16px] mb-3 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
      </div>

      {/* Text skeleton */}
      <div className="space-y-2">
        <div className="relative h-[14px] bg-gray-100 dark:bg-gray-800/50 rounded-md w-4/5 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
        </div>
        <div className="relative h-[12px] bg-gray-100 dark:bg-gray-800/50 rounded-md w-3/5 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 lg:gap-7 items-start">
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
              <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse" />
              <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800/50 rounded animate-pulse" />
            </div>

            {/* Search input skeleton */}
            <div className="h-[52px] w-full max-w-xl bg-gray-100 dark:bg-gray-800/50 rounded-[14px] animate-pulse mb-10" />

            {/* City filter skeleton */}
            <div className="flex flex-wrap gap-2 mb-12">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-[30px] w-16 bg-gray-100 dark:bg-gray-800/50 rounded-full animate-pulse"
                />
              ))}
            </div>

            {/* Category filter skeleton */}
            <div className="flex flex-wrap gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-4 w-16 bg-gray-100 dark:bg-gray-800/50 rounded animate-pulse"
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
          <div className="flex justify-end gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[38px] w-24 bg-gray-100 dark:bg-gray-800/50 rounded-full animate-pulse"
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
