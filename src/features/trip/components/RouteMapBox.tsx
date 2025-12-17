'use client';

import { Map, X } from 'lucide-react';
import TripPlannerMap from './TripPlannerMap';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface RouteMapBoxProps {
  days: TripDay[];
  selectedDayNumber: number;
  activeItemId?: string | null;
  onMarkerClick?: (itemId: string) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * RouteMapBox - Inline Google Maps component for sidebar
 * Shows when map button is tapped, replacing other sidebar content
 */
export default function RouteMapBox({
  days,
  selectedDayNumber,
  activeItemId,
  onMarkerClick,
  onClose,
  className = '',
}: RouteMapBoxProps) {
  const currentDay = days[selectedDayNumber - 1];
  const stopCount = currentDay?.items.length || 0;

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Route Map
          </h3>
          <span className="text-xs text-gray-400">
            · Day {selectedDayNumber}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Map Content */}
      <div className="h-80">
        <TripPlannerMap
          days={days}
          selectedDayNumber={selectedDayNumber}
          activeItemId={activeItemId}
          onMarkerClick={onMarkerClick}
          className="h-full"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {stopCount} {stopCount === 1 ? 'stop' : 'stops'} planned
        </span>
      </div>
    </div>
  );
}
