'use client';

import { Moon, Clock, MapPin } from 'lucide-react';

interface ReturnToHotelCardProps {
  hotelName: string;
  hotelAddress?: string;
  travelTimeMinutes?: number;
  onClick?: () => void;
}

/**
 * ReturnToHotelCard - Shows at end of day indicating return to hotel
 * Follows design system: gray palette, no purple
 */
export default function ReturnToHotelCard({
  hotelName,
  hotelAddress,
  travelTimeMinutes,
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

  return (
    <div
      onClick={onClick}
      className={`
        mt-2 p-3 rounded-xl
        bg-gray-50 dark:bg-gray-800/50
        border border-gray-200 dark:border-gray-800
        ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
        transition-colors
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            Return to hotel
          </p>
          <p className="text-sm font-medium text-black dark:text-white truncate">
            {hotelName}
          </p>
          {hotelAddress && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {hotelAddress}
            </p>
          )}
        </div>

        {/* Travel Time */}
        {travelTimeDisplay && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {travelTimeDisplay}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
