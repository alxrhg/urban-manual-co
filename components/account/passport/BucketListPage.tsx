'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import type { SavedPlace } from '@/types/common';

interface BucketListPageProps {
  savedPlaces: SavedPlace[];
}

// Group saved places by city
function groupByCity(places: SavedPlace[]) {
  const groups = new Map<string, SavedPlace[]>();

  places.forEach(place => {
    const city = place.destination?.city || 'Unknown';
    if (!groups.has(city)) {
      groups.set(city, []);
    }
    groups.get(city)!.push(place);
  });

  return groups;
}

// Visa Application Card - looks like a pending visa
function VisaApplicationCard({
  place,
  onClick,
}: {
  place: SavedPlace;
  onClick: () => void;
}) {
  const destination = place.destination;
  if (!destination) return null;

  const savedDate = new Date(place.created_at).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
    >
      <div className="passport-paper border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
            {destination.image ? (
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
            )}
            {/* Pending badge */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
              <span className="text-[8px] text-amber-900 font-bold">P</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                  {destination.name}
                </h4>
                <p className="passport-data text-[10px] text-gray-400 mt-0.5">
                  {destination.category?.toUpperCase() || 'DESTINATION'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-1" />
            </div>

            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Calendar className="w-3 h-3" />
                <span className="passport-data">{savedDate}</span>
              </div>
              <span className="passport-data text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                PENDING
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export function BucketListPage({ savedPlaces }: BucketListPageProps) {
  const router = useRouter();

  const cityGroups = useMemo(() => groupByCity(savedPlaces), [savedPlaces]);

  if (savedPlaces.length === 0) {
    return (
      <div className="passport-paper passport-guilloche rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 md:p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="passport-data text-sm mb-2">NO PENDING APPLICATIONS</h3>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Save destinations you want to visit. They'll appear here as pending visa applications.
        </p>
      </div>
    );
  }

  // Sort cities by number of saved places
  const sortedCities = Array.from(cityGroups.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="passport-data text-[10px] text-gray-400">BUCKET LIST</p>
          <p className="text-xs text-gray-500 mt-1">
            {savedPlaces.length} pending {savedPlaces.length === 1 ? 'destination' : 'destinations'}
          </p>
        </div>
        <div className="passport-data text-[10px] px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
          APPLICATIONS OPEN
        </div>
      </div>

      {/* Form header - looks like visa application form */}
      <div className="passport-paper rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="passport-data text-[10px] text-gray-400">FORM UM-BUCKET</p>
              <p className="passport-data text-xs font-medium mt-1">TRAVEL INTENT REGISTRY</p>
            </div>
            <div className="text-right">
              <p className="passport-data text-[10px] text-gray-400">STATUS</p>
              <p className="passport-data text-xs text-amber-600 dark:text-amber-400">IN PROGRESS</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-gray-500 mb-6">
            The following destinations have been registered for future visitation. Convert to stamps by marking as visited.
          </p>

          {/* Grouped by city */}
          <div className="space-y-6">
            {sortedCities.map(([city, places]) => (
              <div key={city}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <p className="passport-data text-[10px] text-gray-400">
                    {city.toUpperCase()} ({places.length})
                  </p>
                </div>
                <div className="space-y-3">
                  {places.map((place) => (
                    <VisaApplicationCard
                      key={place.id}
                      place={place}
                      onClick={() => router.push(`/destination/${place.destination_slug}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <p className="passport-data text-[8px] text-gray-400 text-center">
            APPLICATIONS PROCESSED IN ORDER OF SUBMISSION • VISIT DESTINATION TO CONVERT TO STAMP
          </p>
        </div>
      </div>
    </div>
  );
}
