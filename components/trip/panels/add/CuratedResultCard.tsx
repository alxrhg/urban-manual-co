'use client';

import Image from 'next/image';
import { Plus, Check, Eye, MapPin } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface TripOccurrence {
  day: number;
  time: string;
}

interface CuratedResultCardProps {
  destination: Destination;
  travelTime?: number;
  isInTrip: boolean;
  tripOccurrence?: TripOccurrence;
  onQuickAdd: () => void;
  onSelect: () => void;
  onView?: () => void;
}

/**
 * CuratedResultCard - Premium card for Urban Manual catalog results
 *
 * Features:
 * - Image thumbnail
 * - Editorial tagline (micro_description)
 * - Full visual treatment with rich styling
 * - Indicates if already in trip with day/time
 */
export default function CuratedResultCard({
  destination,
  travelTime,
  isInTrip,
  tripOccurrence,
  onQuickAdd,
  onSelect,
  onView,
}: CuratedResultCardProps) {
  const image = destination.image_thumbnail || destination.image;
  const tagline = destination.micro_description;

  // Format price level
  const priceLevel = destination.price_level
    ? '$'.repeat(destination.price_level)
    : undefined;

  // Build meta string: category · neighborhood · price
  const metaParts = [
    destination.category,
    destination.neighborhood || destination.city,
    priceLevel,
  ].filter(Boolean);
  const metaString = metaParts.join(' · ');

  // Format travel time
  const travelTimeString = travelTime
    ? `${travelTime} min from hotel`
    : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-16 h-16 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
          {image ? (
            <Image
              src={image}
              alt={destination.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-medium text-gray-900 dark:text-white truncate">
                {destination.name}
              </h4>
              {metaString && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {metaString}
                </p>
              )}
            </div>

            {/* Action button */}
            {isInTrip ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Day {tripOccurrence?.day}
                  {tripOccurrence?.time && ` ${formatTime(tripOccurrence.time)}`}
                </span>
                {onView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView();
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdd();
                }}
                className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors"
                aria-label="Add to trip"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Travel time */}
          {travelTimeString && !isInTrip && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
              {travelTimeString}
            </p>
          )}

          {/* Tagline */}
          {tagline && (
            <p className="text-sm text-gray-500 dark:text-gray-500 italic line-clamp-1 mt-1">
              &ldquo;{tagline}&rdquo;
            </p>
          )}
        </div>
      </div>
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
