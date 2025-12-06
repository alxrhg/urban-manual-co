/**
 * Chat Page Loading Component
 * Shows skeleton UI while chat interface loads
 */
export default function Loading() {
  return (
    <main className="w-full h-screen flex flex-col">
      {/* Chat header skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-lg" />
      </div>

      {/* Chat messages area skeleton */}
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        {/* AI message */}
        <div className="flex gap-3 max-w-[80%]">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-900 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded" />
          </div>
        </div>

        {/* User message */}
        <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>

        {/* Another AI message */}
        <div className="flex gap-3 max-w-[80%]">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-900 rounded" />
            <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-900 rounded" />
            <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-900 rounded" />
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 animate-pulse">
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
