/**
 * Account Page Loading Component
 * Shows skeleton UI while account data loads
 */
export default function Loading() {
  return (
    <main className="w-full min-h-screen px-6 md:px-10 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Profile header skeleton */}
        <div className="flex items-center gap-4 mb-8 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-20 bg-gray-100 dark:bg-gray-900 rounded-t" />
          ))}
        </div>

        {/* Content grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
