'use client';

import { useCallback } from 'react';
import { useHomepageData } from './HomepageDataProvider';
import { DestinationDrawer } from '@/src/features/detail/DestinationDrawer';

/**
 * HomepageDestinationDrawer - Wrapper for the new DestinationDrawer
 *
 * Bridges the HomepageDataProvider context to the new modular drawer's prop interface.
 */
export function HomepageDestinationDrawer() {
  const {
    selectedDestination,
    isDrawerOpen,
    closeDrawer,
    openDestination,
    filteredDestinations
  } = useHomepageData();

  // Handle clicking on a destination (e.g., in recommendations)
  const handleDestinationClick = useCallback((slug: string) => {
    const destination = filteredDestinations.find(d => d.slug === slug);
    if (destination) {
      openDestination(destination);
    }
  }, [filteredDestinations, openDestination]);

  return (
    <DestinationDrawer
      destination={selectedDestination}
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      onDestinationClick={handleDestinationClick}
    />
  );
}

export default HomepageDestinationDrawer;
