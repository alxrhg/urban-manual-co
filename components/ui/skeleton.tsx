import { cn } from "@/lib/utils"

/**
 * Premium Skeleton - with diagonal shimmer effect
 * Use `shimmer` prop for the premium diagonal shimmer animation
 */
function Skeleton({
  className,
  shimmer = true,
  ...props
}: React.ComponentProps<"div"> & { shimmer?: boolean }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md",
        shimmer
          ? "skeleton-shimmer"
          : "bg-gray-200 dark:bg-gray-800 animate-pulse",
        className
      )}
      {...props}
    />
  )
}

/**
 * Card Skeleton - Matches ItineraryCard dimensions
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Row Skeleton - Matches ItineraryMinimalRow
 */
function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2 w-1/3" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

/**
 * Day Header Skeleton
 */
function DayHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50', className)}>
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

/**
 * Trip Card Skeleton - For trips list
 */
function TripCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 p-4', className)}>
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Itinerary Loading Skeleton - Full day view
 */
function ItineraryLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <DayHeaderSkeleton />
      <div className="space-y-3 pt-4">
        <CardSkeleton />
        <RowSkeleton />
        <CardSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}

export {
  Skeleton,
  CardSkeleton,
  RowSkeleton,
  DayHeaderSkeleton,
  TripCardSkeleton,
  ItineraryLoadingSkeleton,
}
