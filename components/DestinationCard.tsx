'use client';

import { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { MapPin, Check, Edit, Instagram } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationCardSkeleton } from './skeletons/DestinationCardSkeleton';
import { DestinationBadges } from './DestinationBadges';
import { resolveInstagramProfile } from '@/lib/social/instagram';

interface DestinationCardProps {
  destination: Destination;
  onClick: () => void;
  index?: number;
  isVisited?: boolean;
  showBadges?: boolean;
  className?: string;
  isAdmin?: boolean;
  onEdit?: (destination: Destination) => void;
}

/**
 * Enhanced Destination Card with hover interactions and progressive loading
 * Memoized to prevent unnecessary re-renders
 */
export const DestinationCard = memo(function DestinationCard({
  destination,
  onClick,
  index = 0,
  isVisited = false,
  showBadges = true,
  className = '',
  isAdmin = false,
  onEdit,
}: DestinationCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [instagramAvatarError, setInstagramAvatarError] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const instagramProfile = resolveInstagramProfile({
    handle: destination.instagram_handle,
    url: destination.instagram_url,
  });

  useEffect(() => {
    setInstagramAvatarError(false);
  }, [instagramProfile?.handle]);

  // Intersection Observer for progressive loading
  useEffect(() => {
    if (!cardRef.current) return;

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
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      className={`
        group relative w-full flex flex-col transition-all duration-300 ease-out
        cursor-pointer text-left focus-ring
        hover:scale-[1.01]
        active:scale-[0.98]
        ${className}
      `}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
      {/* Image Container with Progressive Loading */}
        <div
        className={`
          relative aspect-video overflow-hidden rounded-2xl
          bg-gray-100 dark:bg-gray-800
          border border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-out
          mb-3
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* Skeleton while loading */}
        {!isLoaded && isInView && (
          <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
        )}

        {/* Actual Image - Use thumbnail for cards, fallback to full image */}
        {isInView && (destination.image_thumbnail || destination.image) && !imageError ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`
              object-cover
              transition-all duration-500 ease-out
              group-hover:scale-105
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            quality={80}
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="h-12 w-12 opacity-20 transition-transform duration-300 group-hover:scale-105" />
          </div>
        )}

          {/* Hover Overlay */}
        <div
          className={`
            absolute inset-0
            bg-gradient-to-t from-black/60 via-transparent to-transparent
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
            pointer-events-none
          `}
        />

          {instagramProfile && (
            <div
              role="button"
              tabIndex={-1}
              aria-label={`Open ${instagramProfile.displayHandle} on Instagram`}
              className="absolute left-3 bottom-3 z-20 flex items-center gap-2 rounded-2xl border border-white/80 dark:border-gray-900/70 bg-white/95 dark:bg-gray-900/90 px-3 py-2 shadow-lg backdrop-blur"
              onClick={(event) => {
                event.stopPropagation();
                if (typeof window !== 'undefined') {
                  window.open(instagramProfile.url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/80 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                {!instagramAvatarError ? (
                  <Image
                    src={instagramProfile.avatarUrl}
                    alt={`${instagramProfile.displayHandle} avatar`}
                    fill
                    sizes="36px"
                    className="object-cover"
                    onError={() => setInstagramAvatarError(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-500 dark:text-gray-300">
                    IG
                  </div>
                )}
              </div>
              <div className="flex flex-col leading-tight text-left">
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <Instagram className="h-3 w-3" />
                  <span>Instagram</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  {instagramProfile.displayHandle}
                </span>
              </div>
            </div>
          )}

        {/* Visited Check Badge - Center */}
        {isVisited && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-gray-900 dark:text-white stroke-[3]" />
          </div>
        )}

        {/* Admin Edit Button - Top Right */}
        {isAdmin && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(destination);
            }}
            className="absolute top-2 right-2 z-20 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-900 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
            title="Edit destination"
            aria-label="Edit destination"
          >
            <Edit className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Badges - Animated on hover */}
        {showBadges && (
          <>
            {/* Michelin Stars - Bottom Left */}
            {typeof destination.michelin_stars === 'number' &&
              destination.michelin_stars > 0 && (
                <div
                  className={`
                    absolute bottom-2 left-2 z-10
                    px-3 py-1 border border-gray-200 dark:border-gray-800
                    rounded-2xl text-gray-600 dark:text-gray-400 text-xs
                    bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
                    flex items-center gap-1.5
                    transform scale-100 group-hover:scale-[1.02]
                    transition-transform duration-300
                    shadow-sm group-hover:shadow-md
                  `}
                >
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                    onError={(e) => {
                      // Fallback to local file if external URL fails
                      const target = e.currentTarget;
                      if (target.src !== '/michelin-star.svg') {
                        target.src = '/michelin-star.svg';
                      }
                    }}
                  />
                  <span>{destination.michelin_stars}</span>
                </div>
              )}
          </>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-1 flex flex-col">
        <div>
        <h3
          className={`
            text-sm font-medium text-gray-900 dark:text-white
              line-clamp-2
            transition-colors duration-200
            group-hover:text-gray-700 dark:group-hover:text-gray-200
          `}
        >
          {destination.name}
        </h3>

        {/* Micro Description - Always show with fallback, stuck to title */}
        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
          {destination.micro_description || 
           (destination.category && destination.city 
             ? `${destination.category} in ${capitalizeCity(destination.city)}`
             : destination.city 
               ? `Located in ${capitalizeCity(destination.city)}`
               : destination.category || '')}
        </div>
        
        {/* ML Forecasting Badges */}
        {showBadges && destination.id && (
          <div className="mt-2">
            <DestinationBadges destinationId={destination.id} compact={true} showTiming={false} />
          </div>
        )}
        </div>
      </div>

      {/* Focus Ring for Accessibility */}
      <div
        className={`
          absolute inset-0 rounded-2xl
          ring-2 ring-offset-2 ring-black dark:ring-white
          opacity-0 focus-within:opacity-100
          transition-opacity duration-200
          pointer-events-none
        `}
      />
    </button>
  );
});

/**
 * Lazy-loaded version that shows skeleton until in viewport
 */
export function LazyDestinationCard(props: DestinationCardProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={cardRef}>
      {shouldRender ? (
        <DestinationCard {...props} />
      ) : (
        <DestinationCardSkeleton />
      )}
    </div>
  );
}

