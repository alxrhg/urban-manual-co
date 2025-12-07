'use client';

import { useMemo } from 'react';
import { useHomepageData } from './HomepageDataProvider';
import { DestinationDrawer } from '@/src/features/detail/DestinationDrawer';

/**
 * HomepageDestinationDrawer - Native homepage drawer integration
 *
 * Bridges the HomepageDataProvider context to the DestinationDrawer component,
 * providing related destinations from the same city for seamless navigation.
 */
export function HomepageDestinationDrawer() {
  const {
    selectedDestination,
    isDrawerOpen,
    closeDrawer,
    openDestination,
    filteredDestinations,
  } = useHomepageData();

  // Get related destinations (same city, different destination)
  const relatedDestinations = useMemo(() => {
    if (!selectedDestination?.city) return [];
    return filteredDestinations
      .filter(
        (d) =>
          d.city?.toLowerCase() === selectedDestination.city?.toLowerCase() &&
          d.slug !== selectedDestination.slug
      )
      .slice(0, 4);
  }, [filteredDestinations, selectedDestination]);

  return (
    <DestinationDrawer
      destination={selectedDestination}
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      onDestinationClick={openDestination}
      relatedDestinations={relatedDestinations}
    />
  );
}

export default HomepageDestinationDrawer;
