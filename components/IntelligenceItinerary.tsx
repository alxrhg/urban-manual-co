/**
 * Intelligence Itinerary
 * Day-by-day schedule with timeline design
 */

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Building2, ArrowRight } from 'lucide-react';
import type { ArchitectureDestination } from '@/types/architecture';

interface DayItinerary {
  date: string;
  destinations: ArchitectureDestination[];
  narrative: string;
  total_time_minutes: number;
  walking_distance_km: number;
}

interface IntelligenceItineraryProps {
  itinerary: DayItinerary[];
}

export function IntelligenceItinerary({ itinerary }: IntelligenceItineraryProps) {
  if (!itinerary?.length) {
    return (
      <div className="py-12 text-center">
        <Calendar className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No itinerary available</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  };

  return (
    <div className="space-y-6">
      {itinerary.map((day, dayIndex) => {
        const { weekday, day: dayNum, month } = formatDate(day.date);
        const hours = Math.floor(day.total_time_minutes / 60);
        const minutes = day.total_time_minutes % 60;

        return (
          <div
            key={dayIndex}
            className="relative"
          >
            {/* Timeline connector */}
            {dayIndex < itinerary.length - 1 && (
              <div className="absolute left-[27px] top-[72px] bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
            )}

            <div className="flex gap-6">
              {/* Date Column */}
              <div className="flex-shrink-0 w-14 text-center">
                <div className="inline-flex flex-col items-center justify-center w-14 h-14 bg-gray-100 dark:bg-gray-900 rounded-xl">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    {weekday}
                  </span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {dayNum}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                {/* Day Header */}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Day {dayIndex + 1}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {hours}h{minutes > 0 ? ` ${minutes}m` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {day.walking_distance_km.toFixed(1)} km
                    </span>
                    <span>{day.destinations.length} stops</span>
                  </div>
                </div>

                {/* Day Narrative */}
                {day.narrative && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {day.narrative}
                  </p>
                )}

                {/* Destinations */}
                <div className="space-y-3">
                  {day.destinations.map((destination, destIndex) => (
                    <Link
                      key={destination.id || destIndex}
                      href={`/destinations/${destination.slug}`}
                      className="group flex items-center gap-4 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      {/* Number/Image */}
                      <div className="flex-shrink-0 relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                        {destination.image ? (
                          <Image
                            src={destination.image}
                            alt={destination.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:underline underline-offset-2 truncate">
                          {destination.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {destination.category && <span>{destination.category}</span>}
                          {destination.architect && (
                            <span>
                              {destination.category && ' · '}
                              {typeof destination.architect === 'string'
                                ? destination.architect
                                : destination.architect.name}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="flex-shrink-0 h-4 w-4 text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
