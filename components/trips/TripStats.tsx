'use client';

import type { TripStats as TripStatsType } from '@/lib/trip';

interface TripStatsProps {
  stats: TripStatsType;
  className?: string;
}

/**
 * Display trip item counts as text
 *
 * Examples:
 * - Full: "2 flights · 1 hotel · 3 restaurants · 2 places"
 * - Partial: "2 flights · 1 hotel"
 * - Empty: "No plans yet"
 */
export function TripStats({ stats, className = '' }: TripStatsProps) {
  const { flights, hotels, restaurants, places } = stats;
  const total = flights + hotels + restaurants + places;

  if (total === 0) {
    return (
      <span className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        No plans yet
      </span>
    );
  }

  // Build stat items (only show categories with count > 0)
  const items: string[] = [];

  if (flights > 0) items.push(`${flights} flight${flights !== 1 ? 's' : ''}`);
  if (hotels > 0) items.push(`${hotels} hotel${hotels !== 1 ? 's' : ''}`);
  if (restaurants > 0) items.push(`${restaurants} restaurant${restaurants !== 1 ? 's' : ''}`);
  if (places > 0) items.push(`${places} place${places !== 1 ? 's' : ''}`);

  return (
    <span className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {items.join(' · ')}
    </span>
  );
}
