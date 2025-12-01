/**
 * Root Loading Component
 *
 * This component is shown instantly while pages are loading.
 * Uses minimal CSS and no JavaScript for fastest possible render.
 */
export default function Loading() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20">
      <div className="max-w-[1800px] mx-auto">
        {/* Minimal skeleton for instant feedback */}
        <div className="mb-12 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
          <div className="h-4 w-48 bg-gray-100 dark:bg-gray-900 rounded" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-2xl bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
        </div>

        {/* Filter chips skeleton */}
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse flex-shrink-0"
            />
          ))}
        </div>

        {/* Grid skeleton - 8 items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse">
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
