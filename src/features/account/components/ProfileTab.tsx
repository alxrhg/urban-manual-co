'use client';

import React from 'react';
import type { VisitedPlace } from '@/types/common';
import { WorldMapVisualization } from '@/components/WorldMapVisualization';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getDestinationImageUrl } from '@/lib/destination-images';

interface ProfileTabProps {
  stats: {
    visitedCount: number;
    savedCount: number;
    citiesCount: number;
    countriesCount: number;
    curationCompletionPercentage: number;
    totalDestinations: number;
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
    visitedDestinationsWithCoords: Array<{
      city: string;
      latitude?: number | null;
      longitude?: number | null;
    }>;
  };
  visitedPlaces: VisitedPlace[];
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ProfileTab({ stats, visitedPlaces }: ProfileTabProps) {
  const router = useRouter();

  return (
    <div className="space-y-12 fade-in">
      <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-4xl font-light mb-1">{stats.curationCompletionPercentage}%</div>
            <div className="text-xs text-gray-500">of curation explored</div>
          </div>
          <div className="text-right text-xs text-gray-400">
            {stats.visitedCount} / {stats.totalDestinations} places
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
            style={{ width: `${Math.min(stats.curationCompletionPercentage, 100)}%` }}
          />
        </div>
        {stats.curationCompletionPercentage < 100 && (
          <p className="text-xs text-gray-400 mt-3">
            {stats.curationCompletionPercentage < 10
              ? "Just getting started! Keep exploring."
              : stats.curationCompletionPercentage < 25
              ? "Great start! Many more places to discover."
              : stats.curationCompletionPercentage < 50
              ? "Halfway there! You're doing amazing."
              : stats.curationCompletionPercentage < 75
              ? "Impressive! You're a seasoned explorer."
              : "Almost there! You've explored most of our curation."}
          </p>
        )}
        {stats.curationCompletionPercentage === 100 && (
          <p className="text-xs text-gray-400 mt-3">
            🎉 Incredible! You've visited every place in our curation!
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="text-2xl font-light mb-1">{stats.visitedCount}</div>
          <div className="text-xs text-gray-500">Visited</div>
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="text-2xl font-light mb-1">{stats.savedCount}</div>
          <div className="text-xs text-gray-500">Saved</div>
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="text-2xl font-light mb-1">{stats.citiesCount}</div>
          <div className="text-xs text-gray-500">Cities</div>
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="text-2xl font-light mb-1">{stats.countriesCount}</div>
          <div className="text-xs text-gray-500">Countries</div>
        </div>
      </div>

      {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">Travel Map</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.uniqueCountries.size > 0 && `${stats.uniqueCountries.size} ${stats.uniqueCountries.size === 1 ? 'country' : 'countries'}`}
              {stats.uniqueCountries.size > 0 && stats.citiesCount > 0 && ' • '}
              {stats.citiesCount > 0 && `${stats.citiesCount} ${stats.citiesCount === 1 ? 'city' : 'cities'}`}
            </p>
          </div>
          <WorldMapVisualization
            visitedCountries={stats.uniqueCountries}
            visitedDestinations={stats.visitedDestinationsWithCoords}
          />
        </div>
      )}

      {visitedPlaces.length > 0 && (
        <div>
          <h2 className="text-xs font-medium mb-4 text-gray-500 dark:text-gray-400">Recent Visits</h2>
          <div className="space-y-2">
            {visitedPlaces.slice(0, 5).map((place) => {
              const displayImage = getDestinationImageUrl(place.destination || null);
              return (
                <button
                  key={place.destination_slug}
                  onClick={() => router.push(`/destination/${place.destination_slug}`)}
                  className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-left"
                >
                  {displayImage && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={displayImage}
                        alt={place.destination?.name || 'Destination'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{place.destination?.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {place.destination && capitalizeCity(place.destination.city)} • {place.destination?.category}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {place.visited_at && new Date(place.visited_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

