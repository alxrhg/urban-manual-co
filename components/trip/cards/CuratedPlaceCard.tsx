'use client';

import Image from 'next/image';
import { MapPin, Check, Users, Clock } from 'lucide-react';
import type { ItineraryItem, TripSettings } from './ItineraryCard';
import type { Destination } from '@/types/destination';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';

interface CuratedPlaceCardProps {
  item: ItineraryItem;
  destination?: Destination;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * CuratedPlaceCard - Premium itinerary card for Urban Manual catalog items
 *
 * Features:
 * - Image thumbnail from destination
 * - Rich metadata (category, neighborhood, price level)
 * - Editorial tagline if available
 * - Booking status indicator
 * - Full visual treatment with image
 */
export default function CuratedPlaceCard({
  item,
  destination,
  isSelected,
  onSelect,
  tripSettings: _tripSettings,
}: CuratedPlaceCardProps) {
  const notes = item.parsedNotes;

  // Get image from destination or parsed notes
  const image = destination?.image_thumbnail || destination?.image || notes?.image;

  // Build category/meta string
  const category = destination?.category || notes?.category;
  const neighborhood = destination?.neighborhood || notes?.city;
  const priceLevel = destination?.price_level
    ? '$'.repeat(destination.price_level)
    : undefined;

  const metaParts = [category, neighborhood, priceLevel].filter(Boolean);
  const metaString = metaParts.join(' · ');

  // Booking/party info
  const partySize = notes?.partySize;
  const bookingStatus = notes?.bookingStatus;
  const isBooked = bookingStatus === 'booked';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        bg-white dark:bg-gray-900 rounded-lg border p-3 transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'border-gray-400 dark:border-gray-500 shadow-sm ring-2 ring-stone-900 dark:ring-white'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
        }
      `}
    >
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-16 h-16 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
          {image ? (
            <Image
              src={image}
              alt={item.title}
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
          {/* Time */}
          {item.time && (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatTimeDisplay(item.time)}
            </p>
          )}

          {/* Title */}
          <h4 className="text-base font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </h4>

          {/* Meta */}
          {metaString && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {metaString}
            </p>
          )}

          {/* Bottom row: party size, booking status */}
          {(partySize || bookingStatus) && (
            <div className="flex items-center gap-2 mt-1">
              {partySize && (
                <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {partySize} guest{partySize > 1 ? 's' : ''}
                </span>
              )}
              {isBooked && (
                <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Check className="w-3 h-3" />
                  Confirmed
                </span>
              )}
              {bookingStatus === 'need-to-book' && (
                <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                  Needs booking
                </span>
              )}
              {bookingStatus === 'waitlist' && (
                <span className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                  Waitlist
                </span>
              )}
            </div>
          )}

          {/* Duration indicator */}
          {notes?.duration && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {notes.duration >= 60
                ? `${Math.floor(notes.duration / 60)}h${notes.duration % 60 > 0 ? ` ${notes.duration % 60}m` : ''}`
                : `${notes.duration}m`
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
