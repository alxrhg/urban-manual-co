/**
 * Homepage Loading State
 *
 * Shown during server-side data fetching while streaming.
 * Uses skeleton components that match the final layout.
 */

import { DestinationGridSkeleton } from "@/components/skeletons/DestinationCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Fixed widths for city filter skeletons to avoid hydration mismatch
const CITY_WIDTHS = [72, 56, 80, 64, 68];
// Fixed widths for category filter skeletons
const CATEGORY_WIDTHS = [88, 64, 72, 96, 56, 80, 68, 76];

export default function HomeLoading() {
  return (
    <main className="relative min-h-screen dark:text-white">
      {/* Hero Section Skeleton */}
      <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
            {/* Greeting Skeleton */}
            <div className="flex-1 flex items-center">
              <div className="w-full">
                {/* Greeting text skeleton */}
                <div className="mb-[50px]">
                  <Skeleton className="h-3 w-48" />
                </div>
                {/* Search input skeleton */}
                <div className="mb-[50px]">
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            </div>

            {/* Filter Pills Skeleton */}
            <div className="flex-1 flex items-end">
              <div className="w-full pt-6">
                {/* City buttons skeleton */}
                <div className="mb-[50px]">
                  <div className="flex flex-wrap gap-x-5 gap-y-3">
                    {CITY_WIDTHS.map((width, i) => (
                      <Skeleton
                        key={`city-${i}`}
                        className="h-3"
                        style={{ width: `${width}px` }}
                      />
                    ))}
                  </div>
                </div>
                {/* Category buttons skeleton */}
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {CATEGORY_WIDTHS.map((width, i) => (
                    <Skeleton
                      key={`cat-${i}`}
                      className="h-3"
                      style={{ width: `${width}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Row Skeleton */}
      <div className="w-full px-6 md:px-10 mt-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="mb-6">
            <div className="flex justify-start sm:justify-end">
              <div className="flex w-full items-center gap-3 overflow-x-auto pb-2 no-scrollbar sm:justify-end sm:overflow-visible">
                {/* View toggle skeleton (Map/Grid) */}
                <Skeleton className="h-[44px] w-[72px] sm:w-[88px] rounded-full flex-shrink-0" />
                {/* Create trip skeleton */}
                <Skeleton className="h-[44px] w-[72px] sm:w-[120px] rounded-full flex-shrink-0" />
                {/* Filter button skeleton */}
                <Skeleton className="h-[44px] w-[44px] rounded-full flex-shrink-0" />
                {/* Discover by Cities skeleton */}
                <Skeleton className="h-[44px] w-[72px] sm:w-[160px] rounded-full flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Trending Section Skeleton */}
          <div className="mb-12 md:mb-16">
            <div className="mb-4">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={`trending-${i}`}
                  className="h-[180px] w-[280px] rounded-xl flex-shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Grid Skeleton */}
          <DestinationGridSkeleton count={20} />
        </div>
      </div>
    </main>
  );
}
