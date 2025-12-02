'use client';

import { useCallback, memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useHomepageStore, useDestinationSelection } from '@/lib/stores/homepage-store';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';

/**
 * DestinationMap - Map view with marker clustering and interactions
 *
 * Features:
 * - Lazy-loaded map component
 * - Integration with homepage store
 * - Marker selection synced with drawer
 * - Split view support
 * - Loading states
 */

// ============================================================================
// Lazy-loaded Map Component
// ============================================================================

const HomeMapSplitView = dynamic(
  () => import('@/components/HomeMapSplitView'),
  {
    ssr: false,
    loading: () => <MapLoadingState />,
  }
);

// ============================================================================
// Types
// ============================================================================

interface DestinationMapProps {
  destinations?: Destination[];
  isLoading?: boolean;
  className?: string;
  showList?: boolean;
}

// ============================================================================
// Loading State
// ============================================================================

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-xl">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Destination Map Component
// ============================================================================

export const DestinationMap = memo(function DestinationMap({
  destinations: propDestinations,
  isLoading: propIsLoading,
  className,
  showList = true,
}: DestinationMapProps) {
  // Store state
  const storeDestinations = useHomepageStore((state) => state.filteredDestinations);
  const storeIsLoading = useHomepageStore((state) => state.isLoading || state.isSearching);

  // Use props or store
  const destinations = propDestinations ?? storeDestinations;
  const isLoading = propIsLoading ?? storeIsLoading;

  // Selection
  const { selectedDestination, selectDestination } = useDestinationSelection();

  // Drawer
  const openDrawer = useDrawerStore((state) => state.open);
  const closeDrawer = useDrawerStore((state) => state.closeAll);

  // Filter to destinations with coordinates
  const mappableDestinations = useMemo(() => {
    return destinations.filter(
      (d) => d.latitude != null && d.longitude != null
    );
  }, [destinations]);

  // Handle marker click
  const handleMarkerSelect = useCallback((destination: Destination) => {
    selectDestination(destination);
    openDrawer('destination', {
      destination,
      place: destination,
    });
  }, [selectDestination, openDrawer]);

  // Handle list item click
  const handleListItemSelect = useCallback((destination: Destination) => {
    selectDestination(destination);
    openDrawer('destination', {
      destination,
      place: destination,
    });
  }, [selectDestination, openDrawer]);

  // Handle close detail
  const handleCloseDetail = useCallback(() => {
    selectDestination(null);
    closeDrawer();
  }, [selectDestination, closeDrawer]);

  // Loading state
  if (isLoading && destinations.length === 0) {
    return <MapLoadingState />;
  }

  // No coordinates warning
  if (!isLoading && mappableDestinations.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl', className)}>
        <div className="text-center p-8">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            No map data available
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The current destinations don&apos;t have location coordinates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <HomeMapSplitView
        destinations={mappableDestinations}
        selectedDestination={selectedDestination}
        onMarkerSelect={handleMarkerSelect}
        onListItemSelect={handleListItemSelect}
        onCloseDetail={handleCloseDetail}
        isLoading={isLoading}
      />
    </div>
  );
});

export default DestinationMap;
