'use client';

import { Hotel, Moon, Clock, MapPin } from 'lucide-react';

interface ReturnToHotelCardProps {
  hotelName: string;
  hotelAddress?: string;
  nightNumber?: number;
  totalNights?: number;
  travelTimeMinutes?: number;
  travelMode?: 'walking' | 'driving' | 'transit';
  onClick?: () => void;
}

/**
 * ReturnToHotelCard - Shows at end of day indicating return to hotel
 */
export default function ReturnToHotelCard({
  hotelName,
  hotelAddress,
  nightNumber,
  totalNights,
  travelTimeMinutes,
  travelMode = 'walking',
  onClick,
}: ReturnToHotelCardProps) {
  // Format travel time
  const formatTravelTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const travelTimeDisplay = formatTravelTime(travelTimeMinutes);

  // Night indicator text
  const nightText = nightNumber && totalNights
    ? totalNights > 1
      ? `Night ${nightNumber} of ${totalNights}`
      : 'Tonight'
    : 'Tonight';

  return (
    <div
      onClick={onClick}
      className={`
        mt-2 p-3 rounded-xl
        bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30
        border border-indigo-100 dark:border-indigo-900/50
        ${onClick ? 'cursor-pointer hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50' : ''}
        transition-colors
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
          <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-0.5">
            <Hotel className="w-3 h-3" />
            <span>{nightText}</span>
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
            {hotelName}
          </p>
          {hotelAddress && (
            <p className="text-xs text-stone-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {hotelAddress}
            </p>
          )}
        </div>

        {/* Travel Time */}
        {travelTimeDisplay && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/50 dark:bg-gray-900/50 flex-shrink-0">
            <Clock className="w-3 h-3 text-stone-400" />
            <span className="text-xs text-stone-500 dark:text-gray-400">
              {travelTimeDisplay}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
