'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { VisitedPlace } from '@/types/common';

interface VisaPagesProps {
  visitedPlaces: VisitedPlace[];
}

// Stamp shapes for visual variety
type StampShape = 'circle' | 'rectangle' | 'oval' | 'hexagon' | 'diamond';

// Generate deterministic stamp appearance from destination
function getStampStyle(slug: string, category: string) {
  const hash = slug.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);

  const shapes: StampShape[] = ['circle', 'rectangle', 'oval', 'hexagon', 'diamond'];
  const colors = ['blue', 'red', 'green', 'purple'] as const;

  // Category influences shape
  const categoryShapes: Record<string, StampShape> = {
    restaurant: 'circle',
    hotel: 'rectangle',
    bar: 'oval',
    cafe: 'hexagon',
    museum: 'diamond',
    gallery: 'diamond',
    shop: 'rectangle',
    landmark: 'hexagon',
  };

  return {
    shape: categoryShapes[category.toLowerCase()] || shapes[hash % shapes.length],
    color: colors[hash % colors.length],
    rotation: ((hash % 11) - 5), // -5 to 5 degrees
  };
}

// Individual destination stamp
function DestinationStamp({
  place,
  onClick,
}: {
  place: VisitedPlace;
  onClick: () => void;
}) {
  const destination = place.destination;
  if (!destination) return null;

  const style = getStampStyle(destination.slug, destination.category || 'default');
  const visitDate = place.visited_at
    ? new Date(place.visited_at).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).toUpperCase()
    : null;

  // Get short name for stamp (first word or abbreviation)
  const shortName = destination.name.split(' ')[0].substring(0, 8).toUpperCase();
  const category = destination.category?.toUpperCase().substring(0, 3) || 'PLX';

  const rotationClass = `stamp-rotate-${style.rotation >= 0 ? style.rotation : `neg-${Math.abs(style.rotation)}`}`;
  const colorClass = `stamp-ink-${style.color}`;

  const renderStamp = () => {
    switch (style.shape) {
      case 'circle':
        return (
          <div className={`stamp-ink ${colorClass} w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center p-1`}>
            <span className="passport-data text-[6px] opacity-60">{category}</span>
            <span className="passport-data text-[10px] md:text-xs font-bold leading-none text-center break-all">{shortName}</span>
            {visitDate && <span className="passport-data text-[6px] mt-0.5">{visitDate}</span>}
          </div>
        );

      case 'rectangle':
        return (
          <div className={`stamp-ink ${colorClass} px-2 py-1.5 md:px-3 md:py-2 border-2 flex flex-col items-center justify-center`}>
            <span className="passport-data text-[6px] opacity-60 border-b border-current pb-0.5 mb-0.5">{category}</span>
            <span className="passport-data text-[10px] md:text-xs font-bold leading-none">{shortName}</span>
            {visitDate && <span className="passport-data text-[6px] mt-1 border-t border-current pt-0.5">{visitDate}</span>}
          </div>
        );

      case 'oval':
        return (
          <div className={`stamp-ink ${colorClass} w-20 h-14 md:w-24 md:h-16 rounded-[100%] border-2 border-double flex flex-col items-center justify-center p-1`}>
            <span className="passport-data text-[5px] opacity-60">{category}</span>
            <span className="passport-data text-[9px] md:text-[11px] font-bold leading-none">{shortName}</span>
            {visitDate && <span className="passport-data text-[5px] mt-0.5">{visitDate}</span>}
          </div>
        );

      case 'hexagon':
        return (
          <div className={`stamp-ink ${colorClass} relative w-16 h-18 md:w-20 md:h-22 flex flex-col items-center justify-center`}>
            <div className="absolute inset-0 border-2 border-current" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            <span className="passport-data text-[6px] opacity-60">{category}</span>
            <span className="passport-data text-[9px] md:text-[10px] font-bold leading-none">{shortName}</span>
            {visitDate && <span className="passport-data text-[5px] mt-0.5">{visitDate}</span>}
          </div>
        );

      case 'diamond':
      default:
        return (
          <div className={`stamp-ink ${colorClass} w-16 h-16 md:w-18 md:h-18 border-2 rotate-45 flex items-center justify-center`}>
            <div className="-rotate-45 text-center p-1">
              <span className="passport-data text-[5px] opacity-60 block">{category}</span>
              <span className="passport-data text-[8px] md:text-[9px] font-bold leading-none">{shortName}</span>
              {visitDate && <span className="passport-data text-[5px] block mt-0.5">{visitDate}</span>}
            </div>
          </div>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className={`${rotationClass} transition-transform hover:scale-110 active:scale-95 inline-flex`}
      title={`${destination.name} - ${destination.city}`}
    >
      {renderStamp()}
    </button>
  );
}

// Group places by country/city
function groupByLocation(places: VisitedPlace[]) {
  const groups = new Map<string, VisitedPlace[]>();

  places.forEach(place => {
    const country = place.destination?.country || 'Unknown';
    const city = place.destination?.city || 'Unknown';
    const key = `${country}|||${city}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(place);
  });

  return groups;
}

export function VisaPages({ visitedPlaces }: VisaPagesProps) {
  const router = useRouter();

  const locationGroups = useMemo(() => groupByLocation(visitedPlaces), [visitedPlaces]);

  if (visitedPlaces.length === 0) {
    return (
      <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 p-8 md:p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <h3 className="passport-data text-sm mb-2">NO ENTRY STAMPS YET</h3>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Your visa pages are empty. Start exploring destinations to collect stamps!
        </p>
      </div>
    );
  }

  // Convert to array sorted by country/city
  const sortedGroups = Array.from(locationGroups.entries()).sort((a, b) => {
    const [countryA] = a[0].split('|||');
    const [countryB] = b[0].split('|||');
    return countryA.localeCompare(countryB);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="passport-data text-[10px] text-gray-400">VISA PAGES</p>
          <p className="text-xs text-gray-500 mt-1">
            {visitedPlaces.length} {visitedPlaces.length === 1 ? 'entry' : 'entries'} across {locationGroups.size} {locationGroups.size === 1 ? 'location' : 'locations'}
          </p>
        </div>
      </div>

      {/* Visa pages by location */}
      {sortedGroups.map(([key, places]) => {
        const [country, city] = key.split('|||');

        return (
          <div
            key={key}
            className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Location header */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="passport-data text-xs font-medium">{city.toUpperCase()}</p>
                <p className="passport-data text-[10px] text-gray-400">{country.toUpperCase()}</p>
              </div>
              <div className="passport-data text-[10px] text-gray-400">
                {places.length} {places.length === 1 ? 'STAMP' : 'STAMPS'}
              </div>
            </div>

            {/* Stamps grid - free-form layout */}
            <div className="p-6 min-h-[150px]">
              <div className="flex flex-wrap gap-4 md:gap-6 items-center">
                {places.map((place) => (
                  <DestinationStamp
                    key={place.id}
                    place={place}
                    onClick={() => router.push(`/destination/${place.destination_slug}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
