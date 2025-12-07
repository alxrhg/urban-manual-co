'use client';

import { MapPin, ChevronUp, X } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

/**
 * Floating indicator that shows when a trip is being built
 * Appears at bottom of screen, expands to show summary on hover/tap
 */
export default function TripIndicator() {
  const { activeTrip, isPanelOpen, totalItems, openPanel, clearTrip } = useTripBuilder();

  // Don't show if no trip or panel is already open
  if (!activeTrip || totalItems === 0 || isPanelOpen) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2">
        {/* Main indicator button */}
        <button
          onClick={openPanel}
          className="flex items-center gap-3 px-5 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
        >
          <div className="relative">
            <MapPin className="w-5 h-5" />
            {/* Badge with count */}
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[10px] font-bold rounded-full">
              {totalItems}
            </span>
          </div>

          <div className="text-left">
            <p className="text-[13px] font-medium leading-tight">
              {activeTrip.title}
            </p>
            <p className="text-[11px] opacity-70">
              {totalItems} {totalItems === 1 ? 'place' : 'places'} • {activeTrip.days.length} {activeTrip.days.length === 1 ? 'day' : 'days'}
            </p>
          </div>

          <ChevronUp className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Clear button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Clear your trip?')) {
              clearTrip();
            }
          }}
          className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
          title="Clear trip"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
