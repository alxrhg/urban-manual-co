import { Skeleton, GridSkeleton } from '@/src/ui/Skeleton';

/**
 * Homepage skeleton for initial load / streaming fallback
 * Matches the visual structure of the actual homepage
 */
export function HomeSkeleton() {
  return (
    <div className="relative min-h-screen dark:text-white">
      {/* Hero Section Skeleton */}
      <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
            <div className="flex-1 flex items-center">
              <div className="w-full space-y-8">
                {/* Greeting skeleton */}
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-12 w-full max-w-md" />
                </div>
                {/* Search input skeleton */}
                <div className="relative">
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
                {/* Filter chips skeleton */}
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations Grid Skeleton */}
      <section className="px-6 md:px-10 pb-12">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <GridSkeleton items={12} aspect="aspect-[4/3]" />

        {/* Pagination skeleton */}
        <div className="flex justify-center items-center gap-2 mt-8">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </section>
    </div>
  );
}

/**
 * Compact skeleton for streaming destinations only
 */
export function DestinationsGridSkeleton() {
  return (
    <div className="px-6 md:px-10 pb-12">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <GridSkeleton items={12} aspect="aspect-[4/3]" />
    </div>
  );
}
