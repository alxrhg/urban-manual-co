'use client';

import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { formatTimeDisplay, formatDuration } from '@/lib/utils/time-calculations';
import { parseItineraryNotes } from '@/types/trip';
import type { ItineraryItem } from '@/types/trip';
import { Ticket, MapPin } from 'lucide-react';

/**
 * Trip settings that affect card display
 */
export interface TripSettings {
  /** Use 24-hour time format */
  use24HourTime?: boolean;
}

interface AttractionCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings?: TripSettings;
}

/**
 * AttractionCard - Displays an attraction/museum/landmark in the itinerary
 *
 * Shows:
 * - Name with category icon
 * - Time (right-aligned)
 * - Type · Neighborhood · Duration
 * - Ticket status/CTA
 */
export default function AttractionCard({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: AttractionCardProps) {
  const notes = parseItineraryNotes(item.notes);

  const category = notes?.category || 'attraction';
  const neighborhood = notes?.city || notes?.address;
  const duration = notes?.duration;
  const ticketUrl = notes?.ticketUrl;
  const bookingStatus = notes?.bookingStatus;

  // Get category icon component
  const IconComponent = getCategoryIconComponent(category);

  // Format time for display
  const displayTime = item.time
    ? (tripSettings?.use24HourTime ? item.time : formatTimeDisplay(item.time))
    : null;

  // Format duration for display
  const displayDuration = duration ? `~${formatDuration(duration)}` : null;

  // Determine ticket CTA state
  const needsTicket = bookingStatus === 'need-to-book' || (!bookingStatus && ticketUrl);
  const hasTicket = bookingStatus === 'booked';

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4
        bg-white dark:bg-gray-900
        border rounded-2xl
        transition-all duration-200
        ${isSelected
          ? 'border-gray-900 dark:border-white ring-1 ring-gray-900 dark:ring-white'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }
      `}
    >
      {/* Row 1: Name + Time */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Category Icon */}
          <span className="flex-shrink-0 text-base">
            {IconComponent ? (
              <IconComponent className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </span>

          {/* Name */}
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </h3>
        </div>

        {/* Time */}
        {displayTime && (
          <span className="flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
            {displayTime}
          </span>
        )}
      </div>

      {/* Row 2: Type · Neighborhood · Duration */}
      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
        {/* Category/Type */}
        <span className="capitalize">{category}</span>

        {/* Neighborhood */}
        {neighborhood && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="truncate">{neighborhood}</span>
          </>
        )}

        {/* Duration */}
        {displayDuration && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{displayDuration}</span>
          </>
        )}
      </div>

      {/* Row 3: Ticket CTA (if applicable) */}
      {(needsTicket || hasTicket) && (
        <div className="flex justify-end mt-2">
          {needsTicket && ticketUrl ? (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5
                text-xs font-medium
                text-gray-700 dark:text-gray-300
                bg-gray-100 dark:bg-gray-800
                hover:bg-gray-200 dark:hover:bg-gray-700
                rounded-full
                transition-colors
              "
            >
              <Ticket className="w-3.5 h-3.5" />
              Get tickets
            </a>
          ) : needsTicket ? (
            <span className="
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-xs font-medium
              text-amber-700 dark:text-amber-400
              bg-amber-50 dark:bg-amber-900/20
              rounded-full
            ">
              <Ticket className="w-3.5 h-3.5" />
              Need tickets
            </span>
          ) : hasTicket ? (
            <span className="
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-xs font-medium
              text-green-700 dark:text-green-400
              bg-green-50 dark:bg-green-900/20
              rounded-full
            ">
              <Ticket className="w-3.5 h-3.5" />
              Booked
            </span>
          ) : null}
        </div>
      )}
    </button>
  );
}
