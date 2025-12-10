'use client';

import { Spinner as UISpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============================================
// DESTINATION SKELETONS
// ============================================

// Skeleton loader for destination cards (grid view)
export function DestinationCardSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}

// Skeleton loader for a grid of destination cards
export function DestinationGridSkeleton({ count = 28 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
      {Array.from({ length: count }).map((_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton for horizontal destination card (used in drawers, lists)
export function HorizontalCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl animate-pulse">
      <div className="w-20 h-20 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
      </div>
    </div>
  );
}

// ============================================
// LIST SKELETONS
// ============================================

// Skeleton loader for list items (e.g., visited places)
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl animate-pulse">
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

// ============================================
// USER/PROFILE SKELETONS
// ============================================

// Skeleton for user profile header
export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-start gap-6 mb-6 animate-pulse">
      <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for user card (in followers/following lists)
export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

// ============================================
// COLLECTION SKELETONS
// ============================================

// Skeleton for collection card
export function CollectionCardSkeleton() {
  return (
    <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Skeleton for collection grid
export function CollectionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton for collection detail page
export function CollectionDetailSkeleton() {
  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Header background */}
      <div className="h-48 w-full bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" />

      <div className="max-w-5xl mx-auto px-6 md:px-10 -mt-12">
        {/* Collection header */}
        <div className="mb-8 animate-pulse">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>

        {/* Destinations grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <HorizontalCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

// ============================================
// TRIP SKELETONS
// ============================================

// Skeleton for trip card
export function TripCardSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
      <Skeleton className="h-40 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for trip list
export function TripListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// DETAIL/DRAWER SKELETONS
// ============================================

// Skeleton for destination detail drawer
export function DetailDrawerSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Image */}
      <Skeleton className="w-full aspect-[4/3] rounded-2xl mb-4" />

      {/* Title & badges */}
      <div className="space-y-3 mb-6">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Map */}
      <Skeleton className="h-48 w-full rounded-2xl mb-6" />

      {/* Related */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-32 h-32 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS/METRIC SKELETONS
// ============================================

// Skeleton loader for stats cards
export function StatsCardSkeleton() {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-2 animate-pulse">
      <Skeleton className="h-6 rounded-full w-12" />
      <Skeleton className="h-3 rounded-full w-16" />
    </div>
  );
}

// Skeleton for stat row (used in account stats)
export function StatsRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 animate-pulse">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-12" />
    </div>
  );
}

// ============================================
// SEARCH SKELETONS
// ============================================

// Skeleton for search suggestion
export function SearchSuggestionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2 animate-pulse">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Skeleton for search results header
export function SearchHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-4 animate-pulse">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

// ============================================
// ACTIVITY/FEED SKELETONS
// ============================================

// Skeleton for activity feed item
export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 animate-pulse">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Skeleton for activity feed
export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// PAGE/SECTION LOADERS
// ============================================

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

// Section loading placeholder
export function SectionLoader({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("flex items-center justify-center", height)}>
      <UISpinner className="size-6" />
    </div>
  );
}

// ============================================
// SPINNERS
// ============================================

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

// ============================================
// CHAT SKELETONS
// ============================================

// Skeleton for chat message
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-3 p-3", isUser && "justify-end")}>
      {!isUser && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />}
      <div className={cn("space-y-2 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <Skeleton className={cn("h-4 rounded-lg", isUser ? "w-48" : "w-64")} />
        <Skeleton className={cn("h-4 rounded-lg", isUser ? "w-32" : "w-48")} />
      </div>
    </div>
  );
}

// Skeleton for chat interface
export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isUser />
      <ChatMessageSkeleton />
    </div>
  );
}

// ============================================
// TABLE SKELETONS
// ============================================

// Skeleton for table row
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for table
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
