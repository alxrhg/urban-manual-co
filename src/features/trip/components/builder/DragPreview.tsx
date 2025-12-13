'use client';

import { memo } from 'react';
import { MapPin, Clock, Calendar } from 'lucide-react';
import Image from 'next/image';
import type { Destination } from '@/types/destination';

interface DragPreviewProps {
  destination: Destination;
  isOverTarget: boolean;
}

/**
 * DragPreview - Visual feedback during drag operation
 *
 * Morphs from a simple card to a scheduled item preview
 * when hovering over a drop target (day).
 */
const DragPreview = memo(function DragPreview({ destination, isOverTarget }: DragPreviewProps) {
  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div
      className={`
        pointer-events-none
        transition-all duration-200 ease-out
        ${isOverTarget
          ? 'scale-105 rotate-1'
          : 'scale-100 rotate-0'
        }
      `}
    >
      <div
        className={`
          flex items-center gap-3 p-3 rounded-xl
          bg-white dark:bg-gray-800
          shadow-2xl border-2
          transition-all duration-200
          ${isOverTarget
            ? 'border-green-500 dark:border-green-400 ring-4 ring-green-500/20'
            : 'border-gray-200 dark:border-gray-700'
          }
        `}
        style={{ width: isOverTarget ? 280 : 200 }}
      >
        {/* Thumbnail */}
        <div
          className={`
            rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0
            transition-all duration-200
            ${isOverTarget ? 'w-12 h-12' : 'w-10 h-10'}
          `}
        >
          {hasImage ? (
            <Image
              src={destination.image_thumbnail || destination.image || ''}
              alt={destination.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
            {destination.name}
          </p>
          <p className="text-[11px] text-gray-500 truncate capitalize">
            {destination.category}
          </p>

          {/* Schedule preview when over target */}
          {isOverTarget && (
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-green-600 dark:text-green-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Add to day
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~1.5h
              </span>
            </div>
          )}
        </div>

        {/* Drop indicator */}
        {isOverTarget && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">+</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default DragPreview;
