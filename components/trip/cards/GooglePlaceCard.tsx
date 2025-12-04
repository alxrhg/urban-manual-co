'use client';

import { Globe, Users, Clock, Check } from 'lucide-react';
import type { ItineraryItem, TripSettings } from './ItineraryCard';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';

interface GooglePlaceCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * GooglePlaceCard - Minimal itinerary card for Google Places items
 *
 * Features:
 * - NO image (licensing constraints)
 * - Globe icon to indicate Google source
 * - Compact, muted styling
 * - Basic metadata only
 */
export default function GooglePlaceCard({
  item,
  isSelected,
  onSelect,
  tripSettings: _tripSettings,
}: GooglePlaceCardProps) {
  const notes = item.parsedNotes;

  // Build category/meta string
  const category = notes?.category;
  const city = notes?.city || item.description;
  const priceLevel = notes?.partySize
    ? undefined  // Don't show price for Google items typically
    : undefined;

  const metaParts = [category, city, priceLevel].filter(Boolean);
  const metaString = metaParts.join(' · ');

  // Party size and booking status
  const partySize = notes?.partySize;
  const bookingStatus = notes?.bookingStatus;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        py-3 px-4 transition-all duration-200 cursor-pointer rounded-lg
        ${isSelected
          ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-stone-900 dark:ring-white'
          : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50'
        }
      `}
    >
      {/* Main row */}
      <div className="flex items-center gap-2">
        {/* Globe icon */}
        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />

        {/* Time + Title on same line */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {item.time && (
              <span className="font-medium">
                {formatTimeDisplay(item.time)}
                <span className="mx-1.5 text-gray-400">·</span>
              </span>
            )}
            <span className="truncate">{item.title}</span>
          </span>
        </div>

        {/* Party size badge (if applicable) */}
        {partySize && (
          <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3" />
            {partySize}
          </span>
        )}
      </div>

      {/* Second row: Meta info */}
      {metaString && (
        <div className="flex items-center gap-2 mt-0.5 pl-6">
          <span className="text-sm text-gray-500 dark:text-gray-500 truncate">
            {metaString}
          </span>

          {/* Duration */}
          {notes?.duration && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {notes.duration >= 60
                ? `${Math.floor(notes.duration / 60)}h`
                : `${notes.duration}m`
              }
            </span>
          )}
        </div>
      )}

      {/* Booking status row */}
      {bookingStatus && bookingStatus !== 'walk-in' && (
        <div className="pl-6 mt-1">
          {bookingStatus === 'booked' && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <Check className="w-3 h-3" />
              Confirmed
            </span>
          )}
          {bookingStatus === 'need-to-book' && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Needs booking
            </span>
          )}
          {bookingStatus === 'waitlist' && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Waitlist
            </span>
          )}
        </div>
      )}
    </div>
  );
}
