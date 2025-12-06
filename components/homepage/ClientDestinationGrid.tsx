'use client';

import { useHomepageData } from './HomepageDataProvider';
import { InstantGridSkeleton } from './InstantGridSkeleton';
import { ServerDestinationGrid } from './ServerDestinationGrid';
import { ClientGridWrapper } from './ClientGridWrapper';

/**
 * Client Destination Grid
 *
 * Uses the HomepageDataProvider context to get destinations.
 * Shows a loading skeleton while data is being fetched.
 * Handles both server-rendered and client-fetched scenarios.
 */

interface ClientDestinationGridProps {
  /** Number of items to display */
  limit?: number;
}

export function ClientDestinationGrid({ limit = 28 }: ClientDestinationGridProps) {
  const { destinations, isLoading } = useHomepageData();

  // Show skeleton while loading
  if (isLoading) {
    return <InstantGridSkeleton count={21} />;
  }

  // Show empty state if no destinations
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

  // Render the grid with destinations
  return (
    <ClientGridWrapper destinations={destinations}>
      <ServerDestinationGrid destinations={destinations} limit={limit} />
    </ClientGridWrapper>
  );
}

export default ClientDestinationGrid;
