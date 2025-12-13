'use client';

import { DoorOpen, Clock, MapPin, Key, Wifi, Car, Coffee, Dumbbell, Waves, Armchair } from 'lucide-react';
import type { ItineraryItem, HotelBooking, TripSettings } from './ItineraryCard';

interface HotelCheckInCardProps {
  item: ItineraryItem;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * HotelCheckInCard - Dedicated card for hotel check-in reminders
 * Shows check-in time, room info, and quick amenities overview
 */
export default function HotelCheckInCard({
  item,
  hotel,
  isSelected,
  onSelect,
  tripSettings,
}: HotelCheckInCardProps) {
  const notes = item.parsedNotes;

  // Get check-in time from hotel booking, parsed notes, or item time
  const checkInTime = hotel?.checkInTime || notes?.checkInTime || item.time || '15:00';
  const hotelName = hotel?.name || notes?.lodgingName || item.title || 'Hotel';
  const roomType = hotel?.roomType || notes?.roomType;
  const address = hotel?.address;
  const confirmationNumber = hotel?.confirmationNumber || notes?.hotelConfirmation;

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return '';
    // Handle both "15:00" and "3:00 PM" formats
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':').map(Number);
      if (tripSettings.is24HourTime) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return time;
  };

  // Check for amenities (from notes or hotel booking)
  const hasWifi = notes?.wifiIncluded ?? true;
  const hasParking = notes?.parkingIncluded ?? hotel?.parkingIncluded;
  const hasBreakfast = notes?.breakfastIncluded ?? hotel?.breakfastIncluded;
  const hasGym = notes?.hasGym ?? hotel?.hasGym;
  const hasPool = notes?.hasPool ?? hotel?.hasPool;
  const hasLounge = notes?.hasLounge ?? hotel?.hasLounge;

  const amenities = [
    hasWifi && { icon: Wifi, label: 'WiFi' },
    hasParking && { icon: Car, label: 'Parking' },
    hasBreakfast && { icon: Coffee, label: 'Breakfast' },
    hasGym && { icon: Dumbbell, label: 'Gym' },
    hasPool && { icon: Waves, label: 'Pool' },
    hasLounge && { icon: Armchair, label: 'Lounge' },
  ].filter(Boolean) as Array<{ icon: typeof Wifi; label: string }>;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200
        bg-emerald-50 dark:bg-emerald-900/20
        ${isSelected ? 'ring-2 ring-emerald-500 dark:ring-emerald-400' : 'hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30'}
      `}
    >
      <div className="p-4">
        {/* Header: Check-in indicator + time */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
              <DoorOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Check-in
              </p>
              <p className="text-sm font-semibold text-stone-900 dark:text-white">
                {hotelName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-800/50">
            <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {formatTime(checkInTime)}
            </span>
          </div>
        </div>

        {/* Address */}
        {address && (
          <p className="text-xs text-stone-500 dark:text-gray-400 flex items-start gap-1 mb-2">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </p>
        )}

        {/* Room & Confirmation */}
        <div className="flex items-center gap-3 text-xs mb-3">
          {roomType && (
            <span className="flex items-center gap-1 text-stone-600 dark:text-gray-300">
              <Key className="w-3 h-3" />
              {roomType}
            </span>
          )}
          {confirmationNumber && (
            <span className="text-stone-500 dark:text-gray-400">
              Conf: <span className="font-mono">{confirmationNumber}</span>
            </span>
          )}
        </div>

        {/* Quick Amenities */}
        {amenities.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-emerald-100 dark:border-emerald-800/50">
            {amenities.slice(0, 5).map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/60 dark:bg-gray-800/50"
                title={label}
              >
                <Icon className="w-3 h-3 text-stone-500 dark:text-gray-400" />
                <span className="text-[10px] text-stone-600 dark:text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
