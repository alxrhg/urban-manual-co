'use client';

interface ContextualLoadingStateProps {
  intent?: {
    primaryIntent?: string;
    city?: string | null;
    category?: string | null;
    modifiers?: string[];
    temporalContext?: {
      timeframe?: string;
    } | null;
  };
  query: string;
}

export function ContextualLoadingState({ intent, query }: ContextualLoadingStateProps) {
  // Content skeleton grid - shows what results will look like
  return (
    <div className="w-full">
      {/* Results skeleton grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="animate-pulse">
            {/* Image skeleton */}
            <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg mb-3" />
            {/* Title skeleton */}
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded mb-2 w-3/4" />
            {/* Subtitle skeleton */}
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
