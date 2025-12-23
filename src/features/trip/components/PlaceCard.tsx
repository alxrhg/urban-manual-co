'use client';

import Image from 'next/image';
import { MapPin, Clock, Star, ExternalLink } from 'lucide-react';
import { CrowdBadge } from '@/features/trip/components/CrowdIndicator';

interface PlaceCardProps {
  name: string;
  category?: string;
  neighborhood?: string;
  time?: string;
  duration?: number;
  rating?: number;
  image?: string;
  url?: string;
  notes?: string;
  compact?: boolean;
}

/**
 * PlaceCard - Compact place/destination card with cohesive design
 * Layout: Place header (name + location) → Time/details → Rating/actions
 * Matches FlightStatusCard and LodgingCard design pattern
 */
export default function PlaceCard({
  name,
  category,
  neighborhood,
  time,
  duration,
  rating,
  image,
  url,
  notes,
  compact = true,
}: PlaceCardProps) {
  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr;
  };

  // Format duration
  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <div className="p-4 rounded-lg bg-stone-100 dark:bg-gray-800/50 flex gap-4">
      {/* Circular Thumbnail - 48px with cream background */}
      <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-[#F5F2ED] dark:bg-gray-700">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized={image.startsWith('/api/')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-stone-400 dark:text-gray-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* HIERARCHY 1: Time — prominent */}
        {time && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[var(--editorial-accent,#B45309)] dark:text-amber-400">
              {formatTime(time)}
            </span>
            {duration && (
              <span className="text-xs text-stone-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full bg-stone-200/50 dark:bg-gray-700/50">
                {formatDuration(duration)}
              </span>
            )}
            <CrowdBadge category={category} time={time} />
          </div>
        )}

        {/* HIERARCHY 2: Venue name — bold */}
        <h3 className="text-base font-bold text-stone-900 dark:text-white leading-tight truncate">
          {name}
        </h3>

        {/* HIERARCHY 3: Category/subtitle — lighter weight, warm gray */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {category && (
            <span className="text-xs font-normal text-stone-400 dark:text-gray-500 capitalize">
              {category}
            </span>
          )}
          {category && neighborhood && (
            <span className="text-stone-300 dark:text-gray-600">·</span>
          )}
          {neighborhood && (
            <p className="text-xs font-normal text-stone-400 dark:text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{neighborhood}</span>
            </p>
          )}
        </div>

        {/* HIERARCHY 4: Status — small colored indicator (rating) */}
        <div className="flex items-center justify-between mt-2">
          {rating ? (
            <div className="flex items-center gap-1">
              <img src="/google-logo.svg" alt="Google" className="w-3 h-3" />
              <span className="text-[11px] font-medium text-stone-500 dark:text-gray-400">
                {rating.toFixed(1)}
              </span>
            </div>
          ) : (
            <div />
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
              title="View details"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Notes (if any) */}
        {notes && (
          <div className="mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
            <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-2">
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
