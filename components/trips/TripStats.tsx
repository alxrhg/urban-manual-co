'use client';

import type { TripStats as TripStatsType } from '@/lib/trip';

interface TripStatsProps {
  stats: TripStatsType;
  showCTA?: boolean;
  className?: string;
}

/**
 * Display trip item counts with emoji icons
 *
 * Examples:
 * - Full: "✈️ 2 · 🏨 1 · 🍽️ 3 · 📍 2"
 * - Partial: "✈️ 2 · 🏨 1"
 * - Empty: "No plans yet"
 */
export function TripStats({ stats, showCTA, className = '' }: TripStatsProps) {
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
  const items: { emoji: string; count: number; label: string }[] = [];

  if (flights > 0) items.push({ emoji: '✈️', count: flights, label: 'flights' });
  if (hotels > 0) items.push({ emoji: '🏨', count: hotels, label: 'hotels' });
  if (restaurants > 0) items.push({ emoji: '🍽️', count: restaurants, label: 'restaurants' });
  if (places > 0) items.push({ emoji: '📍', count: places, label: 'places' });

  // If showCTA is true and missing key items, show a prompt
  if (showCTA) {
    if (flights === 0 && hotels === 0) {
      // Show what we have plus a CTA
      const statDisplay = items.map(item => `${item.emoji} ${item.count}`).join(' · ');
      return (
        <span className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
          {statDisplay && <>{statDisplay} · </>}
          <span className="text-gray-600 dark:text-gray-300">Add flights →</span>
        </span>
      );
    }
  }

  return (
    <span className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 && ' · '}
          {item.emoji} {item.count}
        </span>
      ))}
    </span>
  );
}
