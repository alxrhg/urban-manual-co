'use client';

import { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { MapPin, Check } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationCardSkeleton } from './skeletons/DestinationCardSkeleton';
import { QuickActions } from './QuickActions';

interface DestinationCardProps {
  destination: Destination;
  onClick?: () => void;
  index?: number;
  isVisited?: boolean;
  showQuickActions?: boolean;
  className?: string;
  onAddToTrip?: () => void;
}

/**
 * DestinationCard - Zero-UI editorial card design
 * Features: Large imagery, serif headings, minimal overlays
 * Lovably aesthetic with smooth hover interactions
 */
export const DestinationCard = memo(function DestinationCard({
  destination,
  onClick,
  index = 0,
  isVisited = false,
  showQuickActions = true,
  className = '',
  onAddToTrip,
}: DestinationCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);

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
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  // Format category display
  const categoryDisplay = destination.category
    ? destination.category.charAt(0).toUpperCase() + destination.category.slice(1).toLowerCase()
    : '';

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      type="button"
      className={`
        group relative w-full flex flex-col text-left
        cursor-pointer focus:outline-none
        ${className}
      `}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
      {/* Image Container - Zero-UI: No borders, minimal styling */}
      <div
        className={`
          relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-900 mb-4
          transition-opacity duration-500
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* Skeleton while loading */}
        {!isLoaded && isInView && (
          <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-800" />
        )}

        {/* Image with smooth hover zoom */}
        {isInView && (destination.image_thumbnail || destination.image) && !imageError ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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
            <MapPin className="h-12 w-12 opacity-20" />
          </div>
        )}

        {/* Quick Actions - Appear on hover, top right */}
        {showQuickActions && destination.slug && (
          <div
            className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
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

        {/* Visited Badge - Subtle center overlay */}
        {isVisited && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-black dark:text-white stroke-[2.5]" />
          </div>
        )}

        {/* Michelin Stars - Bottom left, subtle */}
        {typeof destination.michelin_stars === 'number' && destination.michelin_stars > 0 && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-xs font-body">
            <img
              src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
              alt="Michelin star"
              className="h-3 w-3"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== '/michelin-star.svg') {
                  target.src = '/michelin-star.svg';
                }
              }}
            />
            <span className="text-black dark:text-white">{destination.michelin_stars}</span>
          </div>
        )}
      </div>

      {/* Text Content - Editorial typography */}
      <div className="flex-1 flex flex-col">
        {/* Name - Serif display font with hover underline */}
        <h3 className="font-display text-xl md:text-2xl text-black dark:text-white leading-tight mb-1 group-hover:underline decoration-1 underline-offset-4">
          {destination.name}
        </h3>

        {/* Location & Category - Sans-serif, uppercase, subtle */}
        <p className="font-body text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {capitalizeCity(destination.city)}
          {categoryDisplay && (
            <>
              <span className="mx-2">&mdash;</span>
              {categoryDisplay}
            </>
          )}
        </p>
      </div>

      {/* Focus Ring for Accessibility */}
      <div
        className="absolute inset-0 ring-2 ring-offset-2 ring-black dark:ring-white opacity-0 focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"
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
        rootMargin: '100px',
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
