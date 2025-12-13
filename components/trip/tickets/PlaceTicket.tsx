'use client';

import Image from 'next/image';
import { MapPin, Clock, Star } from 'lucide-react';
import TicketCard, { TicketTimeSlot, TicketContent, TicketBadge } from './TicketCard';
import { cn } from '@/lib/utils';

interface PlaceTicketProps {
  name: string;
  category?: string;
  neighborhood?: string;
  time?: string;
  duration?: number;
  rating?: number;
  image?: string;
  notes?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * PlaceTicket - Standard Place Ticket variant
 *
 * Design: Premium ticket style with time slot on left, place details on right
 * Layout: [Time Slot] | [Place Name, Category, Duration, Rating]
 */
export default function PlaceTicket({
  name,
  category,
  neighborhood,
  time,
  duration,
  rating,
  image,
  notes,
  isActive,
  onClick,
  className,
}: PlaceTicketProps) {
  // Format duration for display
  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  // Format time for display (convert 24h to 12h if needed)
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

  const formattedTime = formatTime(time);

  return (
    <TicketCard
      variant="default"
      onClick={onClick}
      isActive={isActive}
      className={className}
    >
      <div className="flex">
        {/* Time Slot - Left Column */}
        <TicketTimeSlot
          time={formattedTime?.time}
          label={formattedTime?.period}
        />

        {/* Content - Right Column */}
        <TicketContent>
          <div className="flex gap-3">
            {/* Thumbnail */}
            {image && (
              <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-stone-200 dark:bg-gray-700">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized={image.startsWith('/api/')}
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Name & Category */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-white leading-tight truncate">
                  {name}
                </h3>
                {category && (
                  <TicketBadge variant="muted" className="flex-shrink-0">
                    {category}
                  </TicketBadge>
                )}
              </div>

              {/* Location */}
              {neighborhood && (
                <p className="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{neighborhood}</span>
                </p>
              )}

              {/* Duration & Rating Row */}
              <div className="flex items-center gap-3 mt-1.5">
                {duration && (
                  <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDuration(duration)}
                  </span>
                )}
                {rating && (
                  <span className="flex items-center gap-1 text-xs text-stone-600 dark:text-gray-300">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <p className="text-[10px] text-stone-400 dark:text-gray-500 mt-2 line-clamp-1 pl-[60px]">
              {notes}
            </p>
          )}
        </TicketContent>
      </div>
    </TicketCard>
  );
}
