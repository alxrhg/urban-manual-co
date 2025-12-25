'use client';

import { useDrawerStore } from '@/lib/stores/drawer-store';
import { TripModal } from '@/components/TripModal';

/**
 * TripModalMount - Renders TripModal at the top level of the app
 * This ensures it appears above all drawers when adding destinations to trips
 */
export function TripModalMount() {
  const { open, type, props, closeDrawer } = useDrawerStore();

  return (
    <TripModal
      isOpen={open && type === 'quick-trip-selector'}
      onClose={closeDrawer}
      mode="add"
      destinationSlug={props?.destinationSlug || ''}
      destinationName={props?.destinationName || ''}
      destinationCity={props?.destinationCity}
    />
  );
}
