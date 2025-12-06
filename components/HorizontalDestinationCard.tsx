'use client';

import { memo } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { getDestinationAltText } from './ui/DestinationImage';

interface HorizontalDestinationCardProps {
  destination: Destination;
  onClick?: () => void;
  showBadges?: boolean;
  className?: string;
}

/**
 * Horizontal destination card with square image on left and info on right
 * Perfect for displaying parent destinations or in compact lists
 */
export const HorizontalDestinationCard = memo(function HorizontalDestinationCard({
  destination,
  onClick,
  showBadges = false,
  className = '',
}: HorizontalDestinationCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 p-3
        border border-gray-200 dark:border-gray-800 
        rounded-2xl 
        bg-white dark:bg-gray-900
        hover:bg-gray-50 dark:hover:bg-gray-800
        transition-all duration-200
        text-left
        group
        ${className}
      `}
    >
      {/* Square Image on Left */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        {destination.image || destination.image_thumbnail ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={getDestinationAltText(destination)}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-400 dark:text-gray-600" aria-hidden="true" />
            <span className="sr-only">{getDestinationAltText(destination)}</span>
          </div>
        )}
      </div>

      {/* Info on Right */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Name */}
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {destination.name}
        </h3>

        {/* Category and City */}
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          {destination.category && (
            <span className="capitalize">{destination.category}</span>
          )}
          {destination.category && destination.city && (
            <span>·</span>
          )}
          {destination.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {capitalizeCity(destination.city)}
            </span>
          )}
        </div>

        {/* Badges - Crown, Michelin, Rating */}
        {(destination.crown || destination.michelin_stars || destination.rating) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {destination.crown && (
              <span className="text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                Crown
              </span>
            )}
            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <span className="text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>⭐</span>
                {destination.michelin_stars} {destination.michelin_stars === 1 ? 'star' : 'stars'}
              </span>
            )}
            {destination.rating && (
              <span className="text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                {destination.rating.toFixed(1)} ⭐
              </span>
            )}
          </div>
        )}

        {/* Micro Description (optional, if space allows) */}
        {destination.micro_description && (
          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1 mt-0.5">
            {destination.micro_description}
          </p>
        )}
      </div>
    </button>
  );
});

