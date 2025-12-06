/**
 * Cities Page Loading Component
 * Shows skeleton UI while cities data loads
 */
export default function Loading() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20">
      <div className="max-w-[1800px] mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-3" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>

        {/* Search skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-12 w-full max-w-md bg-gray-100 dark:bg-gray-900 rounded-xl" />
        </div>

        {/* City cards grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="group">
              <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-2xl mb-3" />
              <div className="h-5 w-3/4 bg-gray-100 dark:bg-gray-900 rounded mb-1" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
