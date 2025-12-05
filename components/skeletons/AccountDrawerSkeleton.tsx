/**
 * Skeleton loading component for AccountDrawer
 * Matches the exact layout of the logged-in account drawer for seamless transition
 * Prevents CLS (Cumulative Layout Shift) during data loading
 */

interface AccountDrawerSkeletonProps {
  /** Additional className for container */
  className?: string;
}

/**
 * Shimmer block component for consistent shimmer effect
 */
function ShimmerBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function AccountDrawerSkeleton({ className = '' }: AccountDrawerSkeletonProps) {
  return (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-950 animate-pulse ${className}`}>
      {/* Close button placeholder */}
      <div className="flex justify-end px-4 pt-4">
        <ShimmerBlock className="w-10 h-10 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-center px-5 pb-4">
          {/* Avatar with progress ring */}
          <ShimmerBlock className="w-[72px] h-[72px] rounded-full" />

          {/* Travel badge */}
          <ShimmerBlock className="mt-2 w-24 h-6 rounded-full" />

          {/* Username */}
          <ShimmerBlock className="mt-3 w-32 h-6 rounded" />

          {/* Email */}
          <ShimmerBlock className="mt-2 w-40 h-4 rounded" />

          {/* Edit profile link */}
          <ShimmerBlock className="mt-3 w-20 h-4 rounded" />
        </div>

        {/* Upcoming Trip section */}
        <div className="px-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ShimmerBlock className="w-4 h-4 rounded" />
            <ShimmerBlock className="w-16 h-3 rounded" />
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ShimmerBlock className="w-4 h-4 rounded" />
                  <ShimmerBlock className="w-16 h-3 rounded" />
                </div>
                <ShimmerBlock className="w-32 h-5 rounded mb-1" />
                <ShimmerBlock className="w-48 h-4 rounded" />
              </div>
              <ShimmerBlock className="w-4 h-4 rounded" />
            </div>
          </div>
        </div>

        {/* Journey Progress */}
        <div className="px-5 mb-4">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <ShimmerBlock className="w-40 h-4 rounded mb-2" />
            <ShimmerBlock className="w-full h-1 rounded-full mb-2" />
            <ShimmerBlock className="w-48 h-3 rounded" />
          </div>
        </div>

        {/* Library Grid */}
        <div className="px-5 mb-4">
          <ShimmerBlock className="w-24 h-3 rounded mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-1 p-4 border border-gray-200 dark:border-gray-800 rounded-2xl"
              >
                <ShimmerBlock className="w-5 h-5 rounded mb-1" />
                <ShimmerBlock className="w-8 h-6 rounded" />
                <ShimmerBlock className="w-12 h-2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShimmerBlock className="w-4 h-4 rounded" />
              <ShimmerBlock className="w-24 h-4 rounded" />
            </div>
            <ShimmerBlock className="w-4 h-4 rounded" />
          </div>
        ))}
      </div>

      {/* Sign Out button placeholder */}
      <div className="px-5 pb-5 pt-2 border-t border-gray-200 dark:border-gray-800">
        <div className="flex w-full items-center justify-center py-3">
          <ShimmerBlock className="w-20 h-4 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller drawer contexts
 */
export function AccountDrawerSkeletonCompact({ className = '' }: AccountDrawerSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {/* Profile row */}
      <div className="flex items-center gap-3 p-4">
        <ShimmerBlock className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="w-24 h-4 rounded" />
          <ShimmerBlock className="w-32 h-3 rounded" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-around p-4 border-t border-gray-200 dark:border-gray-800">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <ShimmerBlock className="w-8 h-5 rounded" />
            <ShimmerBlock className="w-12 h-3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
