'use client';

import Image from 'next/image';
import { MapPin, Star, Calendar, Coffee, Waves, Dumbbell } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface HotelListCardProps {
  hotel: EnrichedItineraryItem & { dayNumber: number };
  onClick?: () => void;
}

/**
 * HotelListCard - Card for hotel list in Hotels tab
 * Shows image, rating, nights, amenities, dates
 */
export default function HotelListCard({ hotel, onClick }: HotelListCardProps) {
  const notes = hotel.parsedNotes;
  const destination = hotel.destination;

  // Get image from notes or destination
  const image = notes?.image || destination?.image || destination?.image_thumbnail;

  // Get rating
  const rating = notes?.rating ?? destination?.rating;

  // Format night range
  const formatNightRange = () => {
    const nightStart = Number(notes?.nightStart) || hotel.dayNumber;
    const nightEnd = Number(notes?.nightEnd) || nightStart;

    if (nightStart === nightEnd) {
      return `Night ${nightStart}`;
    }
    return `Nights ${nightStart}–${nightEnd}`;
  };

  // Format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const checkIn = formatDate(notes?.checkInDate);
  const checkOut = formatDate(notes?.checkOutDate);

  // Amenities
  const hasBreakfast = notes?.breakfastIncluded;
  const hasPool = notes?.hasPool;
  const hasGym = notes?.hasGym;
  const hasSpa = notes?.hasSpa;
  const hasAmenities = hasBreakfast || hasPool || hasGym || hasSpa;

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
    >
      <div className="flex">
        {/* Image */}
        {image && (
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
            <Image
              src={image}
              alt={hotel.title || 'Hotel'}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Header: Name + Night badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-black dark:text-white truncate">
              {hotel.title || notes?.name || 'Hotel'}
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium flex-shrink-0">
              {formatNightRange()}
            </span>
          </div>

          {/* Address */}
          {notes?.address && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {notes.address}
            </p>
          )}

          {/* Rating + Dates row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span>{rating.toFixed(1)}</span>
              </div>
            )}
            {(checkIn || checkOut) && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {checkIn}{checkIn && checkOut && ' – '}{checkOut}
                </span>
              </div>
            )}
          </div>

          {/* Amenities */}
          {hasAmenities && (
            <div className="flex items-center gap-2">
              {hasBreakfast && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                  <Coffee className="w-3 h-3" />
                  <span className="text-[10px]">Breakfast</span>
                </div>
              )}
              {hasPool && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <Waves className="w-3 h-3" />
                </div>
              )}
              {hasGym && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                  <Dumbbell className="w-3 h-3" />
                </div>
              )}
              {hasSpa && (
                <div className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <span className="text-[10px]">Spa</span>
                </div>
              )}
            </div>
          )}

          {/* Confirmation number */}
          {notes?.confirmationNumber && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
              Conf: <span className="font-mono">{notes.confirmationNumber}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
