/**
 * Root Loading Component
 *
 * This component is shown instantly while pages are loading.
 * Uses minimal CSS and no JavaScript for fastest possible render.
 * Features polished shimmer animation for elegant loading experience.
 */

import React from 'react';

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

export default function Loading() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20 animate-in fade-in-0 duration-200">
      <div className="max-w-[1800px] mx-auto">
        {/* Hero/Greeting skeleton */}
        <div className="mb-8 md:mb-12">
          <ShimmerBox className="h-8 md:h-10 w-48 md:w-64 rounded-lg mb-3" />
          <ShimmerBox className="h-4 w-72 md:w-96 rounded-md" />
        </div>

        {/* Search input skeleton */}
        <div className="mb-6 md:mb-8">
          <ShimmerBox className="h-12 md:h-14 w-full max-w-2xl rounded-2xl" />
        </div>

        {/* City tabs skeleton */}
        <div className="flex gap-2 mb-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ShimmerBox
              key={i}
              className="h-9 rounded-full flex-shrink-0"
              style={{ width: `${60 + (i % 3) * 20}px` } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Category filters skeleton */}
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ShimmerBox
              key={i}
              className="h-8 rounded-full flex-shrink-0"
              style={{ width: `${70 + (i % 4) * 15}px` } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Results count skeleton */}
        <div className="flex items-center justify-between mb-6">
          <ShimmerBox className="h-5 w-32 rounded-md" />
          <ShimmerBox className="h-5 w-20 rounded-md" />
        </div>

        {/* Destination cards grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              <ShimmerBox className="aspect-video rounded-2xl mb-3" />
              <ShimmerBox className="h-4 w-3/4 rounded-md mb-1.5" />
              <ShimmerBox className="h-3 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
