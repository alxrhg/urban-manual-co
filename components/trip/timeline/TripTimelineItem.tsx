'use client';

import { memo } from 'react';
import {
  MapPin,
  Coffee,
  Utensils,
  Martini,
  Landmark,
  Train,
  Camera,
  Plane,
  Hotel,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { getCategoryStyle, type CategoryType } from './config';

interface TripTimelineItemProps {
  id: string;
  title: string;
  subtitle?: string;
  category?: CategoryType | string;
  imageUrl?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function getIconForCategory(category?: string) {
  if (!category) return <MapPin className="w-4 h-4" />;

  switch (category) {
    case 'breakfast':
    case 'cafe':
    case 'coffee':
      return <Coffee className="w-4 h-4" />;
    case 'restaurant':
    case 'lunch':
    case 'dinner':
      return <Utensils className="w-4 h-4" />;
    case 'bar':
    case 'drinks':
      return <Martini className="w-4 h-4" />;
    case 'museum':
    case 'gallery':
      return <Landmark className="w-4 h-4" />;
    case 'flight':
      return <Plane className="w-4 h-4" />;
    case 'train':
      return <Train className="w-4 h-4" />;
    case 'hotel':
      return <Hotel className="w-4 h-4" />;
    case 'activity':
      return <Camera className="w-4 h-4" />;
    case 'event':
      return <Calendar className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
}

/**
 * TripTimelineItem - Event card for the timeline
 * Shows title, subtitle, category icon, and optional image
 */
function TripTimelineItemComponent({
  title,
  subtitle,
  category,
  imageUrl,
  isActive = false,
  onClick,
}: TripTimelineItemProps) {
  const styleSet = getCategoryStyle(category);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl transition-all duration-200
        ${isActive
          ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-gray-900 dark:ring-white'
          : 'bg-gray-50/80 dark:bg-gray-800/50 ring-1 ring-black/[0.04] dark:ring-white/[0.06] hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
        }
      `}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail or icon */}
        {imageUrl ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
            bg-gray-100 dark:bg-gray-700/50
            ${styleSet.iconColor}
          `}>
            {getIconForCategory(category)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-gray-900 dark:text-white leading-tight truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      </div>
    </button>
  );
}

export const TripTimelineItem = memo(TripTimelineItemComponent);
