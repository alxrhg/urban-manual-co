'use client';

import { LogOut, Clock, MapPin, AlertCircle, Luggage, Calendar } from 'lucide-react';
import type { ItineraryItem, HotelBooking, TripSettings } from './ItineraryCard';

interface HotelCheckoutCardProps {
  item: ItineraryItem;
  hotel?: HotelBooking;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * HotelCheckoutCard - Dedicated card for hotel checkout reminders
 * Shows checkout time, property info, and helpful reminders
 */
export default function HotelCheckoutCard({
  item,
  hotel,
  isSelected,
  onSelect,
  tripSettings,
}: HotelCheckoutCardProps) {
  const notes = item.parsedNotes;

  // Get checkout time from hotel booking, parsed notes, or item time
  const checkoutTime = hotel?.checkOutTime || notes?.checkOutTime || item.time || '11:00';
  const hotelName = hotel?.name || notes?.lodgingName || item.title || 'Hotel';
  const address = hotel?.address;
  const confirmationNumber = hotel?.confirmationNumber || notes?.hotelConfirmation;
  const phone = hotel?.phone;

  // Calculate nights stayed if we have check-in/out dates
  const checkInDate = hotel?.checkInDate || notes?.checkInDate;
  const checkOutDate = hotel?.checkOutDate || notes?.checkOutDate;

  let nightsStayed: number | null = null;
  if (checkInDate && checkOutDate) {
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      nightsStayed = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      nightsStayed = null;
    }
  }

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return '';
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

  // Parse checkout time to check if it's early (before 10am)
  const isEarlyCheckout = (() => {
    try {
      const [hours] = checkoutTime.split(':').map(Number);
      return hours < 10;
    } catch {
      return false;
    }
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200
        bg-orange-50 dark:bg-orange-900/20
        ${isSelected ? 'ring-2 ring-orange-500 dark:ring-orange-400' : 'hover:bg-orange-100/80 dark:hover:bg-orange-900/30'}
      `}
    >
      <div className="p-4">
        {/* Header: Checkout indicator + time */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Checkout
              </p>
              <p className="text-sm font-semibold text-stone-900 dark:text-white">
                {hotelName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-800/50">
            <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
              {formatTime(checkoutTime)}
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

        {/* Stay info & Confirmation */}
        <div className="flex items-center justify-between gap-3 text-xs mb-3">
          <div className="flex items-center gap-2">
            {nightsStayed && nightsStayed > 0 && (
              <span className="flex items-center gap-1 text-stone-600 dark:text-gray-300">
                <Calendar className="w-3 h-3" />
                {nightsStayed} {nightsStayed === 1 ? 'night' : 'nights'}
              </span>
            )}
            {confirmationNumber && (
              <span className="text-stone-500 dark:text-gray-400">
                Conf: <span className="font-mono">{confirmationNumber}</span>
              </span>
            )}
          </div>
        </div>

        {/* Checkout Reminders */}
        <div className="space-y-1.5 pt-2 border-t border-orange-100 dark:border-orange-800/50">
          {/* Early checkout warning */}
          {isEarlyCheckout && (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-600 dark:text-orange-400">
              <AlertCircle className="w-3 h-3" />
              <span>Early checkout - pack tonight</span>
            </div>
          )}

          {/* Reminder checklist */}
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-gray-400">
            <Luggage className="w-3 h-3" />
            <span>Check safe, closets & chargers</span>
          </div>

          {/* Phone for late checkout */}
          {phone && (
            <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-gray-400">
              <span>Late checkout?</span>
              <a
                href={`tel:${phone}`}
                className="text-orange-600 dark:text-orange-400 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Call front desk
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
