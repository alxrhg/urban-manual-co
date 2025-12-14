'use client';

import { MapPin, ChevronUp } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * TripIndicator - Minimal floating pill
 *
 * Philosophy: Simple, unobtrusive indicator
 * - Just shows trip name and count
 * - Tap to open panel
 * - No extra buttons or actions
 */
export default function TripIndicator() {
  const { user } = useAuth();
  const { activeTrip, savedTrips, isPanelOpen, totalItems, openPanel } = useTripBuilder();

  // Don't show if panel is already open
  if (isPanelOpen) return null;

  // Show "Continue planning" for saved trips when no active trip
  if (!activeTrip && user && savedTrips.length > 0) {
    const recentTrip = savedTrips[0];
    return (
      <button
        onClick={openPanel}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40
                   flex items-center gap-2 px-4 py-2.5
                   bg-gray-900 dark:bg-white rounded-full shadow-lg
                   active:scale-[0.97] transition-transform"
      >
        <span className="text-[13px] font-medium text-white dark:text-gray-900">
          {recentTrip.title} · {recentTrip.itemCount}
        </span>
      </button>
    );
  }

  // Don't show if no active trip with items
  if (!activeTrip || totalItems === 0) return null;

  return (
    <button
      onClick={openPanel}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40
                 flex items-center gap-2 px-4 py-2.5
                 bg-gray-900 dark:bg-white rounded-full shadow-lg
                 active:scale-[0.97] transition-transform"
    >
      <span className="text-[13px] font-medium text-white dark:text-gray-900">
        {activeTrip.title || activeTrip.city || 'Trip'} · {totalItems}
      </span>
    </button>
  );
}
