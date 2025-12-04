'use client';

import { MapPin, Phone, Pencil, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * HotelBooking type for overnight stay information
 */
export interface HotelBooking {
  name: string;
  address?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  roomType?: string;
  confirmationNumber?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  amenities?: {
    breakfast?: boolean;
    pool?: boolean;
    gym?: boolean;
    spa?: boolean;
  };
  bookingStatus?: 'need-to-book' | 'booked' | 'waitlist' | 'walk-in';
}

interface OvernightCardProps {
  hotel: HotelBooking;
  nightNumber: number;
  totalNights: number;
  variant: 'full' | 'condensed';
}

/**
 * Format date string to display format (e.g., "Mon, Dec 4")
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format time string to display format (e.g., "3:00 PM")
 */
function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

/**
 * Get badge variant based on booking status
 */
function getStatusBadge(status?: HotelBooking['bookingStatus']) {
  switch (status) {
    case 'booked':
      return { label: 'Booked', variant: 'success' as const };
    case 'need-to-book':
      return { label: 'Need to Book', variant: 'warning' as const };
    case 'waitlist':
      return { label: 'Waitlist', variant: 'secondary' as const };
    case 'walk-in':
      return { label: 'Walk-in', variant: 'outline' as const };
    default:
      return null;
  }
}

/**
 * OvernightCard - Display hotel/accommodation info at end of day
 *
 * Two variants:
 * - "full": First night at hotel, shows all details
 * - "condensed": Subsequent nights, minimal info
 */
export default function OvernightCard({
  hotel,
  nightNumber,
  totalNights,
  variant,
}: OvernightCardProps) {
  const statusBadge = getStatusBadge(hotel.bookingStatus);

  // Build directions URL
  const directionsUrl = hotel.latitude && hotel.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}`
    : hotel.address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.address)}`
      : null;

  if (variant === 'condensed') {
    return (
      <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌙</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Overnight
              </span>
              <span className="text-xs text-indigo-400 dark:text-indigo-500">·</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-400">
                Night {nightNumber} of {totalNights}
              </span>
            </div>
            {statusBadge && (
              <Badge variant={statusBadge.variant} className="text-[10px]">
                {statusBadge.label}
              </Badge>
            )}
          </div>

          {/* Hotel Info Row */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {hotel.name}
              </p>
              {hotel.roomType && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {hotel.roomType}
                </p>
              )}
            </div>

            {/* Directions Button */}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Directions
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm">🌙</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Overnight
          </span>
          <span className="text-xs text-indigo-400 dark:text-indigo-500">·</span>
          <span className="text-xs text-indigo-500 dark:text-indigo-400">
            {totalNights} {totalNights === 1 ? 'night' : 'nights'}
          </span>
        </div>

        {/* Hotel Name & Address */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {hotel.name}
          </h3>
          {hotel.address && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{hotel.address}</span>
            </p>
          )}
        </div>

        {/* Check-in/Check-out Grid */}
        {(hotel.checkInDate || hotel.checkOutDate) && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">
                Check-in
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(hotel.checkInDate)}
              </p>
              {hotel.checkInTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatTime(hotel.checkInTime)}
                </p>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-1">
                Check-out
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(hotel.checkOutDate)}
              </p>
              {hotel.checkOutTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatTime(hotel.checkOutTime)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Room Type & Confirmation */}
        {(hotel.roomType || hotel.confirmationNumber) && (
          <div className="flex items-center justify-between mb-4 text-xs">
            {hotel.roomType && (
              <span className="text-gray-600 dark:text-gray-300">
                {hotel.roomType}
              </span>
            )}
            {hotel.confirmationNumber && (
              <span className="text-gray-500 dark:text-gray-400">
                Conf: <span className="font-mono font-medium">{hotel.confirmationNumber}</span>
              </span>
            )}
          </div>
        )}

        {/* Amenities Row */}
        {hotel.amenities && Object.values(hotel.amenities).some(Boolean) && (
          <div className="flex items-center gap-3 mb-4 text-xs text-gray-600 dark:text-gray-400">
            {hotel.amenities.breakfast && (
              <span className="flex items-center gap-1">
                <span>☕</span>
                <span>Breakfast included</span>
              </span>
            )}
            {hotel.amenities.pool && (
              <span className="flex items-center gap-1">
                <span>🏊</span>
                <span>Pool</span>
              </span>
            )}
            {hotel.amenities.gym && (
              <span className="flex items-center gap-1">
                <span>💪</span>
                <span>Gym</span>
              </span>
            )}
            {hotel.amenities.spa && (
              <span className="flex items-center gap-1">
                <span>🧖</span>
                <span>Spa</span>
              </span>
            )}
          </div>
        )}

        {/* Status Badge */}
        {statusBadge && (
          <div className="mb-4">
            <Badge variant={statusBadge.variant}>
              {statusBadge.label}
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-indigo-100 dark:border-indigo-900/50">
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions
            </a>
          )}
          {hotel.phone && (
            <a
              href={`tel:${hotel.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modify
          </button>
        </div>
      </div>
    </div>
  );
}
