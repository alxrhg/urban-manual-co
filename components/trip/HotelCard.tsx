'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Building2, Clock, Calendar, Coffee, MapPin } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';
import { differenceInDays, parseISO, format } from 'date-fns';
import type { ItineraryItemNotes } from '@/types/trip';

interface HotelCardProps {
  notes: ItineraryItemNotes;
  title?: string;
  image?: string;
  isCompact?: boolean;
  onClick?: () => void;
}

/**
 * HotelCard - Tripsy-inspired hotel card with check-in/out times at a glance
 */
function HotelCardComponent({ notes, title, image, isCompact = false, onClick }: HotelCardProps) {
  const {
    checkInTime,
    checkOutTime,
    checkInDate,
    checkOutDate,
    address,
    breakfastIncluded,
    hotelConfirmation,
  } = notes;

  // Format times for display
  const checkIn = checkInTime ? formatTimeDisplay(checkInTime) : '15:00';
  const checkOut = checkOutTime ? formatTimeDisplay(checkOutTime) : '11:00';

  // Calculate nights
  const getNights = () => {
    if (!checkInDate || !checkOutDate) return null;
    const nights = differenceInDays(parseISO(checkOutDate), parseISO(checkInDate));
    return nights > 0 ? nights : null;
  };

  const nights = getNights();

  // Format date range
  const getDateRange = () => {
    if (!checkInDate) return null;
    const checkInFormatted = format(parseISO(checkInDate), 'MMM d');
    if (!checkOutDate) return checkInFormatted;
    const checkOutFormatted = format(parseISO(checkOutDate), 'MMM d');
    return `${checkInFormatted} → ${checkOutFormatted}`;
  };

  const dateRange = getDateRange();

  if (isCompact) {
    return (
      <button
        onClick={onClick}
        className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 ring-1 ring-amber-200/50 dark:ring-amber-800/30 hover:ring-amber-300 dark:hover:ring-amber-700 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          {/* Image or icon */}
          {image ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={image}
                alt={title || 'Hotel'}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          )}

          {/* Hotel name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {title || 'Hotel'}
            </p>
            {nights && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {nights} night{nights !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Check-in time */}
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">Check-in</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
              {checkIn}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/50 dark:via-gray-900 dark:to-orange-950/50 ring-1 ring-amber-200/50 dark:ring-amber-800/30 hover:ring-amber-300 dark:hover:ring-amber-700 transition-all text-left overflow-hidden"
    >
      {/* Image header */}
      {image && (
        <div className="relative h-32 w-full">
          <Image
            src={image}
            alt={title || 'Hotel'}
            fill
            className="object-cover"
            sizes="100%"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {nights && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 text-xs font-medium text-gray-900 dark:text-white">
                {nights} night{nights !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {!image && (
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {title || 'Hotel'}
              </h3>
              {address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {address}
                </p>
              )}
            </div>
          </div>
          {hotelConfirmation && (
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {hotelConfirmation}
            </span>
          )}
        </div>

        {/* Check-in/Check-out times */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30">
          <div className="text-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-0.5">
              Check-in
            </span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {checkIn}
              </span>
            </div>
          </div>

          {/* Date range */}
          {dateRange && (
            <div className="text-center px-4 border-x border-amber-200/50 dark:border-amber-800/30">
              <Calendar className="w-4 h-4 text-amber-500 mx-auto mb-0.5" />
              <span className="text-xs text-gray-600 dark:text-gray-300">{dateRange}</span>
            </div>
          )}

          <div className="text-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-0.5">
              Check-out
            </span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {checkOut}
              </span>
            </div>
          </div>
        </div>

        {/* Breakfast included badge */}
        {breakfastIncluded && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Coffee className="w-3.5 h-3.5" />
            Breakfast included
          </div>
        )}

        {/* Nights display if no image */}
        {!image && nights && (
          <div className="mt-3 pt-3 border-t border-amber-100 dark:border-amber-900/30">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export const HotelCard = memo(HotelCardComponent);
