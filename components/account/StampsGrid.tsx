'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PassportStamp } from './PassportStamp';
import { NoVisitedPlacesEmptyState } from '@/components/EmptyStates';
import type { VisitedPlace } from '@/types/common';
import { cityCountryMap } from '@/data/cityCountryMap';

interface StampsGridProps {
  visitedPlaces: VisitedPlace[];
}

// Helper to get country from city
function getCountryFromCity(city: string): string | undefined {
  const normalizedCity = city.toLowerCase();
  return cityCountryMap[normalizedCity] || cityCountryMap[normalizedCity.replace(/\s+/g, '-')];
}

// Group visited places by city
function groupByCity(places: VisitedPlace[]): Map<string, { count: number; firstVisit: string | undefined; country?: string }> {
  const cityMap = new Map<string, { count: number; firstVisit: string | undefined; country?: string }>();

  places.forEach(place => {
    const city = place.destination?.city;
    if (!city) return;

    const existing = cityMap.get(city);
    const visitDate = place.visited_at;
    const country = place.destination?.country || getCountryFromCity(city);

    if (existing) {
      existing.count++;
      // Keep the earliest visit date
      if (visitDate && (!existing.firstVisit || new Date(visitDate) < new Date(existing.firstVisit))) {
        existing.firstVisit = visitDate;
      }
    } else {
      cityMap.set(city, { count: 1, firstVisit: visitDate, country });
    }
  });

  return cityMap;
}

export function StampsGrid({ visitedPlaces }: StampsGridProps) {
  const router = useRouter();

  if (visitedPlaces.length === 0) {
    return <NoVisitedPlacesEmptyState />;
  }

  // Group by city to show one stamp per city
  const citiesVisited = groupByCity(visitedPlaces);

  // Convert to array and sort by visit date (most recent first)
  const sortedCities = Array.from(citiesVisited.entries())
    .sort((a, b) => {
      if (!a[1].firstVisit) return 1;
      if (!b[1].firstVisit) return -1;
      return new Date(b[1].firstVisit).getTime() - new Date(a[1].firstVisit).getTime();
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="passport-data text-[10px] text-gray-400 mb-1">Entry Stamps</p>
          <p className="text-xs text-gray-500">
            {citiesVisited.size} {citiesVisited.size === 1 ? 'city' : 'cities'} visited
          </p>
        </div>
      </div>

      {/* Stamps Grid - Free-form layout */}
      <div className="passport-paper passport-guilloche rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-800 min-h-[300px]">
        <div className="flex flex-wrap gap-4 md:gap-6 justify-center items-center">
          {sortedCities.map(([city, data]) => (
            <PassportStamp
              key={city}
              city={city}
              country={data.country}
              date={data.firstVisit}
              onClick={() => {
                // Navigate to the city page
                const citySlug = city.toLowerCase().replace(/\s+/g, '-');
                router.push(`/cities/${citySlug}`);
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-dashed stamp-ink-blue" />
          <span>Circle stamps</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 stamp-ink-red" />
          <span>Rectangle stamps</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-3 rounded-[100%] border-2 border-double stamp-ink-green" />
          <span>Oval stamps</span>
        </div>
      </div>
    </div>
  );
}
