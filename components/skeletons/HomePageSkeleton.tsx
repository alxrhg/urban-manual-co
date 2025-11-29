import { DestinationGridSkeleton } from "./DestinationCardSkeleton";

/**
 * Skeleton for the homepage hero/search section
 */
function HeroSkeleton() {
  return (
    <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
      <div className="w-full flex md:justify-start flex-1 items-center">
        <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
          <div className="flex-1 flex items-center">
            <div className="w-full space-y-6">
              {/* Greeting skeleton */}
              <div className="space-y-3">
                <div className="h-10 md:h-14 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              </div>

              {/* Search input skeleton */}
              <div className="h-14 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse relative overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          </div>

          {/* Filter pills skeleton */}
          <div className="mt-8 flex flex-wrap gap-2">
            {[70, 90, 65, 85, 75, 80].map((width, i) => (
              <div
                key={i}
                className="h-9 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse relative overflow-hidden"
                style={{ width: `${width}px` }}
              >
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton for the navigation row
 */
function NavigationSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex justify-start sm:justify-end">
        <div className="flex w-full items-center gap-3 sm:justify-end">
          {/* View toggle skeleton */}
          <div className="h-[44px] w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          {/* Create trip skeleton */}
          <div className="h-[44px] w-32 bg-gray-900 dark:bg-gray-100 rounded-full animate-pulse relative overflow-hidden opacity-50">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          {/* Filters skeleton */}
          <div className="h-[44px] w-24 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          {/* Cities link skeleton */}
          <div className="h-[44px] w-36 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for trending/recommendations section
 */
function TrendingSkeleton() {
  return (
    <div className="mb-12 md:mb-16">
      {/* Section title */}
      <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-40 mb-6 animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Horizontal scroll cards */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] h-[180px] bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse relative overflow-hidden"
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full homepage skeleton for Suspense fallback
 */
export function HomePageSkeleton() {
  return (
    <main className="relative min-h-screen dark:text-white">
      <h1 className="sr-only">Loading The Urban Manual...</h1>

      {/* Hero Section */}
      <HeroSkeleton />

      {/* Content Section */}
      <div className="w-full px-6 md:px-10 mt-8">
        <div className="max-w-[1800px] mx-auto">
          {/* Navigation Row */}
          <NavigationSkeleton />

          {/* Trending Section */}
          <TrendingSkeleton />

          {/* Main Grid */}
          <DestinationGridSkeleton count={24} />
        </div>
      </div>
    </main>
  );
}

export default HomePageSkeleton;
