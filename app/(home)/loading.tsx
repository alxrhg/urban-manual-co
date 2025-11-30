/**
 * Homepage Loading State
 *
 * Shown during server-side data fetching while streaming.
 * Uses skeleton components that match the final layout.
 */

import { DestinationGridSkeleton } from "@/components/skeletons/DestinationCardSkeleton";

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
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                {/* Search input skeleton */}
                <div className="mb-[50px]">
                  <div className="h-3 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Filter Pills Skeleton */}
            <div className="flex-1 flex items-end">
              <div className="w-full pt-6">
                {/* City buttons skeleton */}
                <div className="mb-[50px]">
                  <div className="flex flex-wrap gap-x-5 gap-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={`city-${i}`}
                        className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
                        style={{ width: `${60 + Math.random() * 40}px` }}
                      />
                    ))}
                  </div>
                </div>
                {/* Category buttons skeleton */}
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`cat-${i}`}
                      className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
                      style={{ width: `${50 + Math.random() * 50}px` }}
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
            <div className="flex justify-end">
              <div className="flex items-center gap-3">
                {/* View toggle skeleton */}
                <div className="h-[44px] w-24 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                {/* Create trip skeleton */}
                <div className="h-[44px] w-32 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                {/* Filter button skeleton */}
                <div className="h-[44px] w-[44px] bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <DestinationGridSkeleton count={28} />
        </div>
      </div>
    </main>
  );
}
