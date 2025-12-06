/**
 * Destination Page Loading Component
 * Shows skeleton UI while destination details load
 */
export default function Loading() {
  return (
    <main className="w-full min-h-screen">
      {/* Hero image skeleton */}
      <div className="relative w-full h-[40vh] md:h-[50vh] bg-gray-200 dark:bg-gray-800 animate-pulse">
        <div className="absolute bottom-6 left-6">
          <div className="h-10 w-64 bg-gray-300 dark:bg-gray-700 rounded-lg mb-2" />
          <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>
      </div>

      {/* Content section */}
      <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto animate-pulse">
        {/* Action buttons skeleton */}
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-24 bg-gray-100 dark:bg-gray-900 rounded-full" />
          <div className="h-10 w-24 bg-gray-100 dark:bg-gray-900 rounded-full" />
          <div className="h-10 w-10 bg-gray-100 dark:bg-gray-900 rounded-full" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-3 mb-8">
          <div className="h-4 w-full bg-gray-100 dark:bg-gray-900 rounded" />
          <div className="h-4 w-full bg-gray-100 dark:bg-gray-900 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>

        {/* Details grid skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-5 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>

        {/* Map skeleton */}
        <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl mb-8" />

        {/* Related destinations skeleton */}
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800 rounded-xl mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
