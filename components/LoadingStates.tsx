'use client';

// Skeleton loader for destination cards
export function DestinationCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative aspect-square rounded-2xl bg-gray-200 dark:bg-gray-800 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4 mb-1.5" />
      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2" />
    </div>
  );
}

// Skeleton loader for a grid of destination cards
export function DestinationGridSkeleton({ count = 28 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton loader for list items (e.g., visited places)
export function ListItemSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-3 rounded-2xl">
      <div className="relative w-16 h-16 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="flex-1 min-w-0">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded-full w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2 mb-1.5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-1/3" />
      </div>
    </div>
  );
}

// Skeleton loader for a list
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton loader for stats cards
export function StatsCardSkeleton() {
  return (
    <div className="animate-pulse p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-12 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-16" />
    </div>
  );
}

// Full page loading state
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white mb-4" />
        <div className="text-sm text-gray-500 dark:text-gray-400">{message}</div>
      </div>
    </div>
  );
}

// Inline spinner
export function Spinner({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const sizeClasses = {
    xs: "h-3 w-3 border",
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-2"
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    />
  );
}

// Button loading state
export function ButtonSpinner() {
  return (
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
