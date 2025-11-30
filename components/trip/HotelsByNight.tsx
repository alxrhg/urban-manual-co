'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Star, Plus, Moon, AlertCircle } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface HotelsByNightProps {
  hotels: (EnrichedItineraryItem & { dayNumber: number })[];
  totalDays: number;
  onAddHotel: (nightNumber: number) => void;
  onEditHotel: (hotel: EnrichedItineraryItem) => void;
}

/**
 * HotelsByNight - Shows hotels organized by night
 * Ensures every night has exactly one hotel
 */
export default function HotelsByNight({
  hotels,
  totalDays,
  onAddHotel,
  onEditHotel,
}: HotelsByNightProps) {
  // Build a map of night -> hotel
  const hotelsByNight = useMemo(() => {
    const map = new Map<number, EnrichedItineraryItem & { dayNumber: number }>();

    hotels.forEach(hotel => {
      const nightStart = Number(hotel.parsedNotes?.nightStart) || hotel.dayNumber;
      const nightEnd = Number(hotel.parsedNotes?.nightEnd) || nightStart;

      // Assign this hotel to each night it covers
      for (let night = nightStart; night <= nightEnd; night++) {
        // Only set if not already set (first hotel wins for overlap)
        if (!map.has(night)) {
          map.set(night, hotel);
        }
      }
    });

    return map;
  }, [hotels]);

  // Generate array of nights (1 to totalDays)
  const nights = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [totalDays]);

  // Count nights without hotels
  const nightsWithoutHotel = nights.filter(n => !hotelsByNight.has(n)).length;

  if (totalDays === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set your trip dates first to add hotels
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Warning if nights without hotels */}
      {nightsWithoutHotel > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            {nightsWithoutHotel} {nightsWithoutHotel === 1 ? 'night' : 'nights'} without accommodation
          </p>
        </div>
      )}

      {/* Night by night list */}
      {nights.map(night => {
        const hotel = hotelsByNight.get(night);

        if (!hotel) {
          // Empty night - show add button
          return (
            <button
              key={`night-${night}`}
              onClick={() => onAddHotel(night)}
              className="w-full p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                    Night {night}
                  </p>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Add accommodation
                  </p>
                </div>
              </div>
            </button>
          );
        }

        // Hotel assigned to this night
        const notes = hotel.parsedNotes;
        const image = notes?.image || hotel.destination?.image || hotel.destination?.image_thumbnail;
        const rating = notes?.rating ?? hotel.destination?.rating;
        const nightStart = Number(notes?.nightStart) || hotel.dayNumber;
        const nightEnd = Number(notes?.nightEnd) || nightStart;
        const isMultiNight = nightEnd > nightStart;
        const isFirstNight = night === nightStart;

        // For multi-night hotels, show full card only on first night
        // On subsequent nights, show condensed "continued" view
        if (isMultiNight && !isFirstNight) {
          return (
            <div
              key={`night-${night}`}
              onClick={() => onEditHotel(hotel)}
              className="p-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Night {night} · continued stay
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {hotel.title || notes?.name}
                  </p>
                </div>
              </div>
            </div>
          );
        }

        // Full hotel card for first night (or single night)
        return (
          <div
            key={`night-${night}`}
            onClick={() => onEditHotel(hotel)}
            className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
          >
            <div className="flex">
              {/* Image */}
              {image && (
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                  <Image
                    src={image}
                    alt={hotel.title || 'Hotel'}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                      {isMultiNight ? `Nights ${nightStart}–${nightEnd}` : `Night ${night}`}
                    </p>
                    <h4 className="text-sm font-medium text-black dark:text-white truncate">
                      {hotel.title || notes?.name || 'Hotel'}
                    </h4>
                  </div>
                  {rating && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {notes?.address && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {notes.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
