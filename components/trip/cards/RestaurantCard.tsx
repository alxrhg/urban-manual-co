'use client';

import { AlertTriangle, Check, Clock, Users } from 'lucide-react';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import { parseItineraryNotes } from '@/types/trip';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';

/**
 * Trip settings for default values
 */
export interface TripSettings {
  defaultPartySize?: number;
  currency?: string;
}

interface RestaurantCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * Get meal icon based on time or category
 */
function getMealIcon(time: string | null, category?: string): string {
  const normalizedCategory = category?.toLowerCase() || '';

  // Check category first
  if (normalizedCategory.includes('coffee') || normalizedCategory.includes('cafe') || normalizedCategory.includes('café')) {
    return '☕';
  }
  if (normalizedCategory.includes('bar') || normalizedCategory.includes('drinks') || normalizedCategory.includes('cocktail')) {
    return '🍺';
  }

  // Check time for meal type
  if (time) {
    const hour = parseInt(time.split(':')[0], 10);
    if (hour >= 5 && hour < 11) return '☕'; // Breakfast/coffee
    if (hour >= 11 && hour < 15) return '🍽️'; // Lunch
    if (hour >= 17 || hour < 5) return '🍽️'; // Dinner
  }

  return '🍽️'; // Default to dinner icon
}

/**
 * Get booking status display
 */
function getBookingStatusDisplay(status?: ItineraryItemNotes['bookingStatus']): {
  label: string;
  variant: 'warning' | 'success' | 'info' | 'default';
} {
  switch (status) {
    case 'booked':
      return { label: 'Booked', variant: 'success' };
    case 'need-to-book':
      return { label: 'Not booked', variant: 'warning' };
    case 'waitlist':
      return { label: 'Waitlist', variant: 'info' };
    case 'walk-in':
      return { label: 'Walk-in', variant: 'default' };
    default:
      return { label: 'Not booked', variant: 'warning' };
  }
}

/**
 * Format price range as dollar signs
 */
function formatPriceRange(priceLevel?: number): string {
  if (!priceLevel || priceLevel < 1) return '';
  return '$'.repeat(Math.min(priceLevel, 4));
}

/**
 * RestaurantCard - Compact restaurant/dining card for itinerary
 *
 * Display:
 * ┌────────────────────────────────────────────────────────┐
 * │ 🍽️ Joe's Stone Crab                          7:30 PM │
 * │ Seafood · South Beach · $$$$                          │
 * │ 2 guests                               ⚠️ Not booked  │
 * └────────────────────────────────────────────────────────┘
 */
export default function RestaurantCard({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: RestaurantCardProps) {
  const parsedNotes = parseItineraryNotes(item.notes);

  // Extract restaurant data from parsed notes
  const category = parsedNotes?.category;
  const neighborhood = parsedNotes?.city || parsedNotes?.location;
  const priceLevel = parsedNotes?.priority === 'must-do' ? 4 :
                     parsedNotes?.priority === 'want-to' ? 3 : 2; // Fallback price estimate
  const partySize = parsedNotes?.partySize ?? tripSettings.defaultPartySize;
  const bookingStatus = parsedNotes?.bookingStatus;

  const mealIcon = getMealIcon(item.time, category);
  const { label: statusLabel, variant: statusVariant } = getBookingStatusDisplay(bookingStatus);
  const priceDisplay = formatPriceRange(priceLevel);

  // Build meta line: Cuisine · Neighborhood · Price
  const metaParts: string[] = [];
  if (category) metaParts.push(category);
  if (neighborhood) metaParts.push(neighborhood);
  if (priceDisplay) metaParts.push(priceDisplay);
  const metaLine = metaParts.join(' · ');

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-2xl transition-all duration-200
        bg-stone-100 dark:bg-gray-800/50
        hover:bg-stone-200/80 dark:hover:bg-gray-800
        ${isSelected
          ? 'ring-2 ring-stone-400 dark:ring-gray-500'
          : 'hover:ring-1 hover:ring-stone-300 dark:hover:ring-gray-600'
        }
      `}
    >
      {/* Row 1: Icon + Name + Time */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0" aria-hidden="true">
            {mealIcon}
          </span>
          <h3 className="text-base font-semibold text-stone-900 dark:text-white truncate">
            {item.title}
          </h3>
        </div>
        {item.time && (
          <span className="flex items-center gap-1 text-sm text-stone-600 dark:text-gray-300 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-gray-500" />
            {formatTimeDisplay(item.time)}
          </span>
        )}
      </div>

      {/* Row 2: Cuisine · Neighborhood · Price */}
      {metaLine && (
        <p className="text-sm text-stone-600 dark:text-gray-400 truncate mb-2">
          {metaLine}
        </p>
      )}

      {/* Row 3: Party size + Booking status */}
      <div className="flex items-center justify-between gap-2">
        {/* Party size */}
        {partySize && partySize > 0 && (
          <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-gray-400">
            <Users className="w-3.5 h-3.5" />
            {partySize} {partySize === 1 ? 'guest' : 'guests'}
          </span>
        )}
        {!partySize && <span />}

        {/* Booking status badge */}
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${statusVariant === 'warning'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : ''
            }
            ${statusVariant === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : ''
            }
            ${statusVariant === 'info'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : ''
            }
            ${statusVariant === 'default'
              ? 'bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300'
              : ''
            }
          `}
        >
          {statusVariant === 'warning' && (
            <AlertTriangle className="w-3 h-3" />
          )}
          {statusVariant === 'success' && (
            <Check className="w-3 h-3" />
          )}
          {statusLabel}
        </span>
      </div>
    </button>
  );
}
