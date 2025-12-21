'use client';

import { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { MapPin, Check, Star, Clock, DollarSign, ExternalLink, Bookmark, Plus } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { QuickActions } from '@/components/QuickActions';

interface DestinationListItemProps {
  destination: Destination;
  onClick?: () => void;
  index?: number;
  isVisited?: boolean;
  className?: string;
}

export const DestinationListItem = memo(function DestinationListItem({
  destination,
  onClick,
  index = 0,
  isVisited = false,
  className = '',
}: DestinationListItemProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const itemRef = useRef<HTMLButtonElement>(null);

  // Intersection Observer for progressive loading
  useEffect(() => {
    if (!itemRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    observer.observe(itemRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  const getPriceDisplay = () => {
    if (!destination.price_level) return null;
    return '$'.repeat(destination.price_level);
  };

  return (
    <button
      ref={itemRef}
      onClick={handleClick}
      type="button"
      className={`
        group relative w-full flex gap-4 p-4
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        rounded-2xl
        transition-all duration-300 ease-out
        cursor-pointer text-left
        hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700
        hover:scale-[1.005]
        active:scale-[0.995]
        ${className}
      `}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
      {/* Image */}
      <div className="relative flex-shrink-0 w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {isInView && (destination.image_thumbnail || destination.image) && !imageError ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={destination.name}
            fill
            sizes="160px"
            className={`
              object-cover
              transition-all duration-500 ease-out
              group-hover:scale-105
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            quality={80}
            loading={index < 5 ? 'eager' : 'lazy'}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="h-8 w-8 opacity-20" />
          </div>
        )}

        {/* Visited Badge */}
        {isVisited && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </div>
        )}

        {/* Michelin Badge */}
        {typeof destination.michelin_stars === 'number' && destination.michelin_stars > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg text-xs flex items-center gap-1">
            <img src="/michelin-star.svg" alt="Michelin" className="h-3 w-3" />
            <span>{destination.michelin_stars}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                {destination.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span>{destination.category}</span>
                <span>·</span>
                <span>{capitalizeCity(destination.city)}</span>
                {destination.neighborhood && (
                  <>
                    <span>·</span>
                    <span>{destination.neighborhood}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions - visible on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <QuickActions
                destinationId={destination.id}
                destinationSlug={destination.slug}
                destinationName={destination.name}
                destinationCity={destination.city}
                showAddToTrip={true}
                compact
              />
            </div>
          </div>

          {/* Description */}
          {destination.micro_description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
              {destination.micro_description}
            </p>
          )}
        </div>

        {/* Footer Row - Metadata */}
        <div className="flex items-center gap-4 mt-3">
          {/* Rating */}
          {typeof destination.rating === 'number' && destination.rating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <img src="/google-logo.svg" alt="Google" className="h-3 w-3" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {destination.rating.toFixed(1)}
              </span>
              {destination.user_ratings_total && (
                <span className="text-gray-400 dark:text-gray-500">
                  ({destination.user_ratings_total.toLocaleString()})
                </span>
              )}
            </div>
          )}

          {/* Price Level */}
          {getPriceDisplay() && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <span>{getPriceDisplay()}</span>
            </div>
          )}

          {/* Saves Count */}
          {destination.saves_count && destination.saves_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Bookmark className="w-3 h-3" />
              <span>{destination.saves_count.toLocaleString()} saved</span>
            </div>
          )}

          {/* Crown Badge */}
          {destination.crown && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <span>👑</span>
              <span>Editor's Pick</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
});
