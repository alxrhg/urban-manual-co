/**
 * City Page Loading Component
 * Shows skeleton UI while city destinations load
 */
export default function Loading() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20">
      <div className="max-w-[1800px] mx-auto">
        {/* City header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-3" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>

        {/* Stats skeleton */}
        <div className="flex gap-6 mb-8 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-20 bg-gray-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>

        {/* Filter chips skeleton */}
        <div className="flex gap-2 mb-8 overflow-hidden animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-8 w-24 bg-gray-100 dark:bg-gray-900 rounded-full flex-shrink-0"
            />
          ))}
        </div>

        {/* Destinations grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800 rounded-2xl mb-3" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
