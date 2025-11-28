'use client';

import Image from 'next/image';
import { MapPin, Clock, Star, ExternalLink } from 'lucide-react';

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
    <div className="p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50 flex gap-4">
      {/* Thumbnail */}
      {image && (
        <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-stone-200 dark:bg-gray-700">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* REGION 1: Place Header (Name & Location) */}
        <div className="mb-2">
          <h3 className="text-base font-semibold text-stone-900 dark:text-white leading-tight truncate">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {neighborhood && (
              <p className="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{neighborhood}</span>
              </p>
            )}
            {neighborhood && category && (
              <span className="text-stone-300 dark:text-gray-600">•</span>
            )}
            {category && (
              <span className="text-xs text-stone-500 dark:text-gray-400 capitalize">
                {category}
              </span>
            )}
          </div>
        </div>

        {/* REGION 2: Time & Duration */}
        {(time || duration) && (
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-gray-300 mb-2">
            {time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                {formatTime(time)}
              </span>
            )}
            {time && duration && (
              <span className="text-stone-300 dark:text-gray-600">•</span>
            )}
            {duration && (
              <span className="text-stone-500 dark:text-gray-400">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        )}

        {/* REGION 3: Rating & Actions */}
        <div className="flex items-center justify-between">
          {rating ? (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-stone-600 dark:text-gray-300">
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
