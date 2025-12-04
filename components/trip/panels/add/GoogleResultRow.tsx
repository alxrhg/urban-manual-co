'use client';

import { Plus, Check, Eye, Globe } from 'lucide-react';

interface GooglePlace {
  place_id?: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  rating?: number;
  price_level?: number;
  latitude?: number;
  longitude?: number;
}

interface TripOccurrence {
  day: number;
  time: string;
}

interface GoogleResultRowProps {
  place: GooglePlace;
  distance?: number; // in miles
  isInTrip: boolean;
  tripOccurrence?: TripOccurrence;
  onQuickAdd: () => void;
  onSelect: () => void;
  onView?: () => void;
}

/**
 * GoogleResultRow - Minimal row for Google Places results
 *
 * Features:
 * - No image (licensing constraints)
 * - Globe icon to indicate Google source
 * - Muted, compact styling
 * - Shows rating and price level
 */
export default function GoogleResultRow({
  place,
  distance,
  isInTrip,
  tripOccurrence,
  onQuickAdd,
  onSelect,
  onView,
}: GoogleResultRowProps) {
  // Format price level
  const priceLevel = place.price_level
    ? '$'.repeat(place.price_level)
    : undefined;

  // Build meta parts for first row: category · price · rating
  const topMetaParts = [
    place.category,
    priceLevel,
    place.rating ? `${place.rating.toFixed(1)}★` : undefined,
  ].filter(Boolean);
  const topMetaString = topMetaParts.join(' · ');

  // Build location string: neighborhood or city + distance
  const locationParts = [
    place.neighborhood || place.city,
    distance ? `${distance.toFixed(1)} mi` : undefined,
  ].filter(Boolean);
  const locationString = locationParts.join(' · ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className="py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer transition-colors group"
    >
      {/* Main row */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Globe icon + Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-normal text-gray-700 dark:text-gray-300 truncate">
            {place.name}
          </span>
        </div>

        {/* Right: Meta or In-trip badge */}
        {isInTrip ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              Day {tripOccurrence?.day}
              {tripOccurrence?.time && ` · ${formatTime(tripOccurrence.time)}`}
            </span>
            {onView && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-shrink-0">
            {topMetaString && (
              <span className="text-sm text-gray-500 dark:text-gray-500">
                {topMetaString}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              className="w-6 h-6 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              aria-label="Add to trip"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Second row: Location */}
      {locationString && !isInTrip && (
        <div className="flex items-center gap-2 mt-0.5 pl-6">
          <span className="text-sm text-gray-500 dark:text-gray-500">
            {locationString}
          </span>
        </div>
      )}

      {/* In-trip state shows category/location on second row */}
      {isInTrip && (
        <div className="flex items-center gap-2 mt-0.5 pl-6">
          <span className="text-sm text-gray-500 dark:text-gray-500">
            {[place.category, place.neighborhood || place.city, priceLevel].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}

// Helper to format time display
function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
