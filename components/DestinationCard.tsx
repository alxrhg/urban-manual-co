'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationCardSkeleton } from './skeletons/DestinationCardSkeleton';

interface DestinationCardProps {
  destination: Destination;
  onClick: () => void;
  index?: number;
  isVisited?: boolean;
  showBadges?: boolean;
  className?: string;
}

/**
 * Enhanced Destination Card with hover interactions and progressive loading
 */
export function DestinationCard({
  destination,
  onClick,
  index = 0,
  isVisited = false,
  showBadges = true,
  className = '',
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
        group relative w-full transition-all duration-300 ease-out
        cursor-pointer text-left focus-ring
        ${isVisited ? 'opacity-60' : 'opacity-100'}
        hover:scale-[1.02]
        active:scale-[0.98]
        ${className}
      `}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
      {/* Image Container with Progressive Loading */}
      <div
        className={`
          relative overflow-hidden
          bg-gray-100
          transition-opacity duration-[240ms] ease
          group-hover:opacity-[0.88]
          mb-4
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ aspectRatio: '4 / 5' }}
      >
        {/* Skeleton while loading */}
        {!isLoaded && isInView && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}

        {/* Actual Image */}
        {isInView && destination.image && !imageError ? (
          <Image
            src={destination.image}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`
              object-cover
              transition-opacity duration-[240ms] ease
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
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin className="h-12 w-12 opacity-20" />
          </div>
        )}

        {/* Badges - Animated on hover */}
        {showBadges && (
          <>
            {/* Michelin Stars - Bottom Left */}
            {destination.michelin_stars &&
              typeof destination.michelin_stars === 'number' &&
              destination.michelin_stars > 0 && (
                <div
                  className={`
                    absolute bottom-2 left-2 z-10
                    px-3 py-1 border border-[#E6E6E6]
                    text-[#111111] text-xs
                    bg-white/90 backdrop-blur-sm
                    flex items-center gap-1.5
                  `}
                >
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  <span>{destination.michelin_stars}</span>
                </div>
              )}
          </>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-4">
        <h3
          className={`
            text-[24px] font-light leading-[1.45]
            text-[#111111]
            line-clamp-2
            tracking-[-0.2px]
          `}
        >
          {destination.name}
        </h3>

        {destination.micro_description ? (
          <div className="text-[13px] text-[#777] leading-[1.45] mt-2 line-clamp-1">
            {destination.micro_description}
          </div>
        ) : null}
      </div>

      {/* Focus Ring for Accessibility */}
      <div
        className={`
          absolute inset-0
          ring-2 ring-offset-2 ring-blue-500
          opacity-0 focus-within:opacity-100
          transition-opacity duration-200
          pointer-events-none
        `}
      />
    </button>
  );
}

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

