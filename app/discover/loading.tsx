/**
 * Discover Page Loading Component
 * Shows skeleton UI while discover content loads
 */
export default function Loading() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20">
      <div className="max-w-[1800px] mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg mb-3" />
          <div className="h-4 w-72 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>

        {/* Featured section skeleton */}
        <div className="mb-12 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-4 mb-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-100 dark:bg-gray-900 rounded-full" />
          ))}
        </div>

        {/* Content grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800 rounded-xl mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded mb-1" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
