/**
 * Homepage Loading State
 *
 * Shown during server-side data fetching while streaming.
 * Uses skeleton components that match the final layout.
 * Features polished shimmer animation for elegant loading experience.
 */

import React from 'react';
import { DestinationGridSkeleton } from "@/components/skeletons/DestinationCardSkeleton";

/**
 * Shimmer effect overlay for skeleton elements
 */
function ShimmerBox({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-800/60 ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}

export default function HomeLoading() {
  return (
    <main className="relative min-h-screen dark:text-white animate-in fade-in-0 duration-200">
      {/* Hero Section Skeleton */}
      <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
            {/* Greeting Skeleton */}
            <div className="flex-1 flex items-center">
              <div className="w-full">
                {/* Greeting text skeleton */}
                <div className="mb-[50px]">
                  <ShimmerBox className="h-4 w-48 rounded-md" />
                </div>
                {/* Search input skeleton */}
                <div className="mb-[50px]">
                  <ShimmerBox className="h-4 w-64 rounded-md" />
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
                      <ShimmerBox
                        key={`city-${i}`}
                        className="h-4 rounded-md"
                        style={{ width: `${60 + (i % 3) * 20}px` }}
                      />
                    ))}
                  </div>
                </div>
                {/* Category buttons skeleton */}
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ShimmerBox
                      key={`cat-${i}`}
                      className="h-4 rounded-md"
                      style={{ width: `${50 + (i % 4) * 15}px` }}
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
                <ShimmerBox className="h-[44px] w-24 rounded-full" />
                {/* Create trip skeleton */}
                <ShimmerBox className="h-[44px] w-32 rounded-full" />
                {/* Filter button skeleton */}
                <ShimmerBox className="h-[44px] w-[44px] rounded-full" />
              </div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <DestinationGridSkeleton count={21} />
        </div>
      </div>
    </main>
  );
}
