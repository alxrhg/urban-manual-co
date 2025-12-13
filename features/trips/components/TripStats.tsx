'use client';

import { useMemo } from 'react';
import { MapPin, Calendar, Clock, Route, Plane, Building2, Utensils } from 'lucide-react';
import { cn, card, textStyles, iconSize } from '@/lib/design-tokens';
import type { TripDay, TripStats as TripStatsType } from '../types';
import { calculateTripStats } from '../types';

// ============================================
// TYPES
// ============================================

interface TripStatsProps {
  /** Trip days to calculate stats from */
  days: TripDay[];
  /** Trip destination */
  destination?: string | null;
  /** Trip start date */
  startDate?: string | null;
  /** Trip end date */
  endDate?: string | null;
  /** Display variant */
  variant?: 'grid' | 'inline' | 'compact';
  /** Additional class names */
  className?: string;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Format date range for display
 */
function formatDateRange(startDate?: string | null, endDate?: string | null): string | null {
  if (!startDate && !endDate) return null;
  const start = startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const end = endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  return start && end ? `${start} – ${end}` : start || end;
}

/**
 * Pluralize a word
 */
function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

// ============================================
// GRID VARIANT
// ============================================

function GridStats({ stats, destination, dateRange }: { stats: TripStatsType; destination?: string | null; dateRange: string | null }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Stops */}
      <div className={card.padded}>
        <div className={textStyles.stat}>{stats.totalStops}</div>
        <div className={cn(textStyles.caption, 'flex items-center gap-1.5')}>
          <MapPin className={iconSize.xs} />
          Stops
        </div>
      </div>

      {/* Total Days */}
      <div className={card.padded}>
        <div className={textStyles.stat}>{stats.totalDays}</div>
        <div className={cn(textStyles.caption, 'flex items-center gap-1.5')}>
          <Calendar className={iconSize.xs} />
          Days
        </div>
      </div>

      {/* Categories */}
      <div className={card.padded}>
        <div className={textStyles.stat}>{stats.categories.size}</div>
        <div className={cn(textStyles.caption, 'flex items-center gap-1.5')}>
          <Route className={iconSize.xs} />
          Categories
        </div>
      </div>

      {/* Date or Destination */}
      <div className={card.padded}>
        {dateRange ? (
          <>
            <div className="text-sm font-light text-gray-900 dark:text-white truncate">{dateRange}</div>
            <div className={cn(textStyles.caption, 'flex items-center gap-1.5')}>
              <Clock className={iconSize.xs} />
              Dates
            </div>
          </>
        ) : destination ? (
          <>
            <div className="text-sm font-light text-gray-900 dark:text-white truncate">{destination}</div>
            <div className={cn(textStyles.caption, 'flex items-center gap-1.5')}>
              <MapPin className={iconSize.xs} />
              Destination
            </div>
          </>
        ) : (
          <>
            <div className={textStyles.stat}>—</div>
            <div className={textStyles.caption}>No dates set</div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// INLINE VARIANT
// ============================================

function InlineStats({ stats }: { stats: TripStatsType }) {
  const items: string[] = [];

  if (stats.flights > 0) items.push(`${stats.flights} ${pluralize(stats.flights, 'flight')}`);
  if (stats.trains > 0) items.push(`${stats.trains} ${pluralize(stats.trains, 'train')}`);
  if (stats.hotels > 0) items.push(`${stats.hotels} ${pluralize(stats.hotels, 'hotel')}`);
  if (stats.restaurants > 0) items.push(`${stats.restaurants} ${pluralize(stats.restaurants, 'restaurant')}`);
  if (stats.places > 0) items.push(`${stats.places} ${pluralize(stats.places, 'place')}`);
  if (stats.activities > 0) items.push(`${stats.activities} ${pluralize(stats.activities, 'activity', 'activities')}`);

  if (items.length === 0) {
    return <span className={textStyles.bodySecondary}>No plans yet</span>;
  }

  return <span className={textStyles.bodySecondary}>{items.join(' · ')}</span>;
}

// ============================================
// COMPACT VARIANT
// ============================================

function CompactStats({ stats }: { stats: TripStatsType }) {
  return (
    <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
      {stats.flights > 0 && (
        <div className="flex items-center gap-1">
          <Plane className={iconSize.xs} />
          <span className="text-xs">{stats.flights}</span>
        </div>
      )}
      {stats.hotels > 0 && (
        <div className="flex items-center gap-1">
          <Building2 className={iconSize.xs} />
          <span className="text-xs">{stats.hotels}</span>
        </div>
      )}
      {stats.restaurants > 0 && (
        <div className="flex items-center gap-1">
          <Utensils className={iconSize.xs} />
          <span className="text-xs">{stats.restaurants}</span>
        </div>
      )}
      {stats.places > 0 && (
        <div className="flex items-center gap-1">
          <MapPin className={iconSize.xs} />
          <span className="text-xs">{stats.places}</span>
        </div>
      )}
      {stats.totalStops === 0 && (
        <span className="text-xs">No plans yet</span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * TripStats - Flexible trip statistics display
 *
 * Variants:
 * - grid: Card grid with icons (for trip edit pages)
 * - inline: Text-based inline display (for trip cards)
 * - compact: Icon-only minimal display (for headers)
 */
export function TripStats({
  days,
  destination,
  startDate,
  endDate,
  variant = 'grid',
  className,
}: TripStatsProps) {
  const stats = useMemo(() => calculateTripStats(days), [days]);
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <div className={className}>
      {variant === 'grid' && (
        <GridStats stats={stats} destination={destination} dateRange={dateRange} />
      )}
      {variant === 'inline' && <InlineStats stats={stats} />}
      {variant === 'compact' && <CompactStats stats={stats} />}
    </div>
  );
}

export default TripStats;
