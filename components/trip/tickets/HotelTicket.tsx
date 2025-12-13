'use client';

import Image from 'next/image';
import { LogIn, LogOut, MapPin, Phone, Globe, Key, Calendar, Building2 } from 'lucide-react';
import TicketCard, { TicketTimeSlot, TicketContent, TicketBadge } from './TicketCard';
import { cn } from '@/lib/utils';

type HotelAction = 'check-in' | 'check-out';

interface HotelTicketProps {
  // Hotel info
  name: string;
  address?: string;
  // Action type
  action: HotelAction;
  // Time
  time?: string;
  date?: string;
  // Booking
  confirmationNumber?: string;
  roomType?: string;
  // Contact
  phone?: string;
  website?: string;
  // Image
  image?: string;
  // Notes
  notes?: string;
  // Interaction
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * HotelTicket - Hotel Card (Check-in/Out) variant
 *
 * Design: Distinct icons for Arrival (check-in) vs Departure (check-out)
 * Shows hotel name, address, time, confirmation
 */
export default function HotelTicket({
  name,
  address,
  action,
  time,
  date,
  confirmationNumber,
  roomType,
  phone,
  website,
  image,
  notes,
  isActive,
  onClick,
  className,
}: HotelTicketProps) {
  const isCheckIn = action === 'check-in';

  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return { time: `${displayHours}:${minutes.toString().padStart(2, '0')}`, period };
    } catch {
      return { time: timeStr, period: '' };
    }
  };

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formattedTime = formatTime(time);

  // Icon and colors based on action type
  const ActionIcon = isCheckIn ? LogIn : LogOut;
  const actionLabel = isCheckIn ? 'Check-in' : 'Check-out';
  const actionColorClass = isCheckIn
    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
    : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30';

  return (
    <TicketCard
      variant="hotel"
      onClick={onClick}
      isActive={isActive}
      className={className}
    >
      <div className="flex">
        {/* Time Slot with Action Icon - Left Column */}
        <div className="flex flex-col items-center justify-center px-3 py-3 min-w-[70px] border-r border-dashed border-stone-200 dark:border-gray-700">
          {/* Action Icon */}
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mb-1', actionColorClass)}>
            <ActionIcon className="w-4 h-4" />
          </div>
          {/* Time */}
          {formattedTime && (
            <span className="text-sm font-semibold tabular-nums text-stone-900 dark:text-white">
              {formattedTime.time}
            </span>
          )}
          {formattedTime?.period && (
            <span className="text-[9px] uppercase tracking-wider font-medium text-stone-400 dark:text-gray-500">
              {formattedTime.period}
            </span>
          )}
        </div>

        {/* Content - Right Column */}
        <TicketContent>
          <div className="flex gap-3">
            {/* Hotel Thumbnail */}
            {image ? (
              <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-stone-200 dark:bg-gray-700">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-stone-400 dark:text-gray-500" />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Name & Action Badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-white leading-tight truncate">
                  {name}
                </h3>
                <TicketBadge
                  variant={isCheckIn ? 'success' : 'warning'}
                  className="flex-shrink-0"
                >
                  {actionLabel}
                </TicketBadge>
              </div>

              {/* Address */}
              {address && (
                <p className="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{address}</span>
                </p>
              )}

              {/* Date & Room Type Row */}
              <div className="flex items-center gap-3 mt-1.5">
                {date && (
                  <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(date)}
                  </span>
                )}
                {roomType && (
                  <span className="text-xs text-stone-400 dark:text-gray-500">
                    {roomType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation & Actions Row */}
          {(confirmationNumber || phone || website) && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 dark:border-gray-800">
              {confirmationNumber && (
                <p className="text-[10px] text-stone-400 dark:text-gray-500 flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  <span className="font-mono font-medium">{confirmationNumber}</span>
                </p>
              )}

              {/* Quick Actions */}
              <div className="flex items-center gap-1 ml-auto">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                    title="Call hotel"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                    title="Visit website"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <p className="text-[10px] text-stone-400 dark:text-gray-500 mt-2 line-clamp-1">
              {notes}
            </p>
          )}
        </TicketContent>
      </div>
    </TicketCard>
  );
}
