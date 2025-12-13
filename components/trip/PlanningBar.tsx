'use client';

import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronUp, MapPin } from 'lucide-react';

/**
 * PlanningBar - Global trip planning indicator
 *
 * Collapsed state: Shows trip context and opens planning sheet
 * - Mobile: Compact pill at bottom
 * - Desktop: Richer bar with day chips visible
 */
export default function PlanningBar() {
  const { user } = useAuth();
  const {
    activeTrip,
    savedTrips,
    isPanelOpen,
    totalItems,
    isPlanningMode,
    planningCity,
    defaultDay,
    isPlanningSheetOpen,
    togglePlanningSheet,
    openPanel,
  } = useTripBuilder();

  // Don't show if panel is already open or planning sheet is open
  if (isPanelOpen || isPlanningSheetOpen) return null;

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

  // If planning mode is OFF and no active trip, show nothing
  if (!isPlanningMode && (!activeTrip || totalItems === 0)) return null;

  // Planning mode ON - show planning bar
  if (isPlanningMode) {
    const tripCityLabel = planningCity || activeTrip?.city || 'Select city';
    const dayLabel = activeTrip ? `Day ${defaultDay}` : '';
    const itemCount = activeTrip?.days[defaultDay - 1]?.items.length || 0;

    return (
      <button
        onClick={togglePlanningSheet}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40
                   flex items-center gap-3 pl-4 pr-3 py-2.5
                   bg-blue-600 dark:bg-blue-500 rounded-full shadow-lg
                   hover:bg-blue-700 dark:hover:bg-blue-600
                   active:scale-[0.97] transition-all"
      >
        {/* Planning indicator */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white/90" />
          <span className="text-[13px] font-medium text-white">
            Plan: {tripCityLabel}
          </span>
        </div>

        {/* Day indicator (desktop only) */}
        {activeTrip && (
          <>
            <span className="hidden sm:inline text-white/50">·</span>
            <span className="hidden sm:inline text-[13px] text-white/90">
              {dayLabel}
            </span>
          </>
        )}

        {/* Item count */}
        {totalItems > 0 && (
          <>
            <span className="text-white/50">·</span>
            <span className="text-[13px] text-white/90">
              {totalItems} {totalItems === 1 ? 'place' : 'places'}
            </span>
          </>
        )}

        {/* Expand indicator */}
        <ChevronUp className="w-4 h-4 text-white/70 ml-1" />
      </button>
    );
  }

  // Planning mode OFF but has active trip - show simple indicator
  return (
    <button
      onClick={togglePlanningSheet}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40
                 flex items-center gap-2 px-4 py-2.5
                 bg-gray-900 dark:bg-white rounded-full shadow-lg
                 active:scale-[0.97] transition-transform"
    >
      <span className="text-[13px] font-medium text-white dark:text-gray-900">
        {activeTrip?.title || activeTrip?.city || 'Trip'} · {totalItems}
      </span>
      <ChevronUp className="w-4 h-4 text-white/70 dark:text-gray-500" />
    </button>
  );
}
