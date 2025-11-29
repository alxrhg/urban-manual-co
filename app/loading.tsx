/**
 * Homepage Loading State
 *
 * This component is automatically used by Next.js for:
 * - Initial page load while data is being fetched
 * - Route transitions when navigating to the homepage
 * - Streaming while server components are rendering
 */
export default function HomeLoading() {
  return (
    <main className="relative min-h-screen dark:text-white">
      {/* Hero skeleton */}
      <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl">
            {/* Greeting skeleton */}
            <div className="space-y-4">
              <div className="h-10 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-5 w-72 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
            </div>
            {/* Search skeleton */}
            <div className="mt-8 h-14 w-full bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
            {/* City filters skeleton */}
            <div className="mt-12 space-y-6">
              <div className="flex flex-wrap gap-5">
                <div className="h-4 w-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-14 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-14 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              {/* Category filters skeleton */}
              <div className="flex flex-wrap gap-5">
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-14 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-18 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-14 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid Nav skeleton */}
      <div className="w-full px-6 md:px-10 mt-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="mb-6 flex justify-end">
            <div className="flex items-center gap-3">
              <div className="h-11 w-24 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse" />
              <div className="h-11 w-32 bg-gray-900 dark:bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
