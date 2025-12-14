'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { TimeBlock } from '@/lib/intelligence/types';

interface TimelineItemProps {
  block: TimeBlock;
  onClick?: () => void;
  onEdit?: () => void;
  isLast?: boolean;
}

/**
 * TimelineItem - Row with leading dot marker
 * Lovably style: title with underline hover, mono time
 */
export default function TimelineItem({
  block,
  onClick,
  onEdit,
  isLast,
}: TimelineItemProps) {
  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div
      className={`
        relative grid grid-cols-[1fr_auto] gap-4 group cursor-pointer
        ${isLast ? '' : 'mb-6'}
      `}
      onClick={onClick}
    >
      {/* Marker Dot */}
      <div className="absolute -left-[31px] top-1 w-3 h-3 bg-gray-900 dark:bg-white rounded-full border-4 border-white dark:border-[#0a0a0a] z-10" />

      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        {(block.place?.image || block.place?.imageThumbnail) && (
          <div className="relative w-12 h-12 flex-shrink-0 rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={block.place.imageThumbnail || block.place.image || ''}
              alt={block.title}
              fill
              className="object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
              sizes="48px"
            />
          </div>
        )}

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-lg text-gray-900 dark:text-white group-hover:underline decoration-1 underline-offset-4 truncate">
            {block.title}
          </h4>

          <div className="flex items-center gap-2 mt-1">
            {block.category && (
              <span className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                {block.category}
              </span>
            )}
            {block.place?.city && (
              <>
                <span className="text-gray-300 dark:text-gray-700">\u00b7</span>
                <span className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {block.place.city}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Time Column */}
      <div className="text-right flex-shrink-0">
        <span className="text-xs font-mono text-gray-400 dark:text-gray-600">
          {block.startTime || '--:--'}
        </span>
        {block.durationMinutes && (
          <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-0.5">
            {formatDuration(block.durationMinutes)}
          </p>
        )}
      </div>
    </div>
  );
}
