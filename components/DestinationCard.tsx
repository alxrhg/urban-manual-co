'use client';

import { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { MapPin, Check } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationCardSkeleton } from './skeletons/DestinationCardSkeleton';
import { DestinationBadges } from './DestinationBadges';
import { QuickActions } from './QuickActions';

interface DestinationCardProps {
  destination: Destination;
  onClick?: () => void;
  index?: number;
  isVisited?: boolean;
  showBadges?: boolean;
  showQuickActions?: boolean;
  className?: string;
  onAddToTrip?: () => void;
  /** Enable staggered fade-in animation based on index */
  animateIn?: boolean;
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
  showQuickActions = true,
  className = '',
  onAddToTrip,
  animateIn = true,
}: DestinationCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);

  // Staggered animation delay calculation (cap at 500ms for perceived speed)
  const staggerDelay = Math.min(index * 50, 500);

  // Intersection Observer for progressive loading and animation
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Trigger animation after stagger delay
            if (animateIn && !hasAnimated) {
              setTimeout(() => setHasAnimated(true), staggerDelay);
            }
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
  }, [animateIn, hasAnimated, staggerDelay]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Simply call onClick - Drawer component handles scroll locking without layout shift
    onClick?.();
  };

  // Animation classes for staggered fade-in
  const animationClasses = animateIn
    ? hasAnimated || !isInView
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-3'
    : 'opacity-100 translate-y-0';

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      type="button"
      className={`
        group relative w-full flex flex-col
        cursor-pointer text-left focus-ring
        hover:scale-[1.01]
        active:scale-[0.98]
        transition-all duration-300 ease-out
        ${animationClasses}
        ${className}
      `}
      style={{
        transitionDelay: animateIn && !hasAnimated ? `${staggerDelay}ms` : '0ms',
      }}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
        {/* Image Container with Progressive Loading */}
        <div
          className="relative aspect-video overflow-hidden rounded-2xl
            bg-neutral-100 dark:bg-neutral-800/60
            border border-neutral-200/50 dark:border-neutral-700/30
            mb-3"
        >
        {/* Shimmer skeleton while loading - always present until image loads */}
        <div
          className={`
            absolute inset-0 overflow-hidden
            transition-opacity duration-500 ease-out
            ${isLoaded ? 'opacity-0' : 'opacity-100'}
          `}
        >
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
            }}
          />
        </div>

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
              ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'}
            `}
            quality={80}
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            placeholder="empty"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(true);
            }}
          />
        ) : isInView && imageError ? (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
            <MapPin className="h-10 w-10 opacity-30 transition-transform duration-300 group-hover:scale-105" />
          </div>
        ) : null}

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

        {/* Quick Actions - Top Right on Hover */}
        {showQuickActions && destination.slug && (
          <div
            className={`
              absolute top-2 right-2 z-20
              opacity-0 group-hover:opacity-100
              translate-y-1 group-hover:translate-y-0
              transition-all duration-200
            `}
          >
            <QuickActions
              destinationId={destination.id}
              destinationSlug={destination.slug}
              destinationName={destination.name}
              destinationCity={destination.city}
              showAddToTrip={true}
              compact
              onAddToTrip={onAddToTrip}
            />
          </div>
        )}

        {/* Visited Check Badge - Center */}
        {isVisited && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-gray-900 dark:text-white stroke-[3]" />
          </div>
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

