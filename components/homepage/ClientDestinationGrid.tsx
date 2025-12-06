'use client';

import { useHomepageData } from './HomepageDataProvider';
import { InstantGridSkeleton } from './InstantGridSkeleton';
import { ServerDestinationGrid } from './ServerDestinationGrid';
import { ClientGridWrapper } from './ClientGridWrapper';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client Destination Grid with Pagination
 *
 * Uses the HomepageDataProvider context for:
 * - Data loading with fallback
 * - Pagination (4 rows per page)
 * - Filtering (city, category, search)
 */

export function ClientDestinationGrid() {
  const {
    destinations,
    displayedDestinations,
    filteredDestinations,
    isLoading,
    currentPage,
    totalPages,
    setCurrentPage,
    selectedCity,
    selectedCategory,
    searchTerm,
    clearFilters,
    openDestination,
  } = useHomepageData();

  const hasFilters = selectedCity || selectedCategory || searchTerm;

  // Show skeleton while loading
  if (isLoading) {
    return <InstantGridSkeleton count={21} />;
  }

  // Show empty state if no destinations at all
  if (destinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No destinations found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Unable to load destinations. Please check your connection and refresh the page.
        </p>
      </div>
    );
  }

  // Show no results for current filters
  if (filteredDestinations.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No results found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          Try adjusting your filters or search term
        </p>
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white
                     bg-gray-100 dark:bg-white/10 rounded-full
                     hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Grid */}
      <ClientGridWrapper
        destinations={displayedDestinations}
        onDestinationSelect={openDestination}
      >
        <ServerDestinationGrid destinations={displayedDestinations} />
      </ClientGridWrapper>

      {/* Pagination Controls - Apple style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-12 mb-8">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-10 h-10 rounded-full
                       border border-gray-200 dark:border-white/10
                       bg-white dark:bg-white/5
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-gray-50 dark:hover:bg-white/10
                       transition-all duration-200"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;

              // Smart page number display
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-full text-[13px] font-medium transition-all duration-200 ${
                    currentPage === pageNum
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-10 h-10 rounded-full
                       border border-gray-200 dark:border-white/10
                       bg-white dark:bg-white/5
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-gray-50 dark:hover:bg-white/10
                       transition-all duration-200"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="text-center text-[13px] text-gray-400 dark:text-gray-500 mb-8">
        Showing {(currentPage - 1) * displayedDestinations.length + 1}-
        {Math.min(currentPage * displayedDestinations.length, filteredDestinations.length)} of {filteredDestinations.length} destinations
      </div>
    </div>
  );
}

export default ClientDestinationGrid;
