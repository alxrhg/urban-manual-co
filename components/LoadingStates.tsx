'use client';

import { Spinner as UISpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton loader for destination cards
export function DestinationCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square rounded-2xl mb-2" />
      <Skeleton className="h-3 rounded-full w-3/4 mb-1.5" />
      <Skeleton className="h-3 rounded-full w-1/2" />
    </div>
  );
}

// Skeleton loader for a grid of destination cards
export function DestinationGridSkeleton({ count = 28 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton loader for list items (e.g., visited places)
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl">
      <Skeleton className="w-16 h-16 flex-shrink-0 rounded-xl" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 rounded-full w-2/3" />
        <Skeleton className="h-3 rounded-full w-1/2" />
        <Skeleton className="h-3 rounded-full w-1/3" />
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
    <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2">
      <Skeleton className="h-6 rounded-full w-12" />
      <Skeleton className="h-3 rounded-full w-16" />
    </div>
  );
}

// Full page loading state
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <UISpinner className="size-8 mb-4 mx-auto" />
        <div className="text-sm text-gray-500 dark:text-gray-400">{message}</div>
      </div>
    </div>
  );
}

// Inline spinner
export function Spinner({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const sizeClasses = {
    xs: "size-3",
    sm: "size-4",
    md: "size-6",
    lg: "size-8"
  };

  return (
    <UISpinner className={sizeClasses[size]} />
  );
}

// Button loading state
export function ButtonSpinner() {
  return <UISpinner className="size-4" />;
}
