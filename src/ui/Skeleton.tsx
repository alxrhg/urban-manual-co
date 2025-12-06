'use client';

import React from 'react';

/**
 * Shimmer overlay for polished loading animation
 */
function ShimmerOverlay() {
  return (
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
      style={{
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      }}
    />
  );
}

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800/60 ${className}`}>
      <ShimmerOverlay />
    </div>
  );
}

/**
 * Grid of skeleton cards for loading states
 */
export function GridSkeleton({
  items = 6,
  aspect = 'aspect-video',
}: {
  items?: number;
  aspect?: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="space-y-2"
          style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
        >
          <div className={`relative ${aspect} rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 overflow-hidden`}>
            <ShimmerOverlay />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
