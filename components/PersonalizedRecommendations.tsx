'use client';

import { useRecommendations } from '@/hooks/useRecommendations';
import { Destination } from '@/types/destination';
import Image from 'next/image';
import { MapPin, Sparkles } from 'lucide-react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Link from 'next/link';
import { useMemo, memo } from 'react';

interface PersonalizedRecommendationsProps {
  limit?: number;
  title?: string;
  showTitle?: boolean;
  onDestinationClick?: (destination: Destination) => void;
  className?: string;
  filterCity?: string; // Filter recommendations by city slug
}

function PersonalizedRecommendationsComponent({
  limit = 12,
  title = 'For You',
  showTitle = true,
  onDestinationClick,
  className = '',
  filterCity,
}: PersonalizedRecommendationsProps) {
  const { recommendations, loading, error } = useRecommendations({
    limit: filterCity ? limit * 2 : limit, // Fetch more if filtering to ensure we have enough
    enabled: true, // Only fetch if user is authenticated (handled by API)
    filterCity,
  });

  // Don't show anything if not authenticated or no recommendations
  if (error || (!loading && recommendations.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <div className={className}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={CARD_WRAPPER}>
              <div className={`${CARD_MEDIA} mb-2 bg-gray-200 dark:bg-gray-800 animate-pulse`} />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const destinations = useMemo(() => {
    let filtered = recommendations
      .map((rec) => rec.destination)
      .filter((d): d is Destination => !!d);

    // Additional client-side city filtering (as backup)
    if (filterCity) {
      filtered = filtered.filter(d =>
        d.city?.toLowerCase() === filterCity.toLowerCase()
      );
    }

    return filtered;
  }, [recommendations, filterCity]);

  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
        {destinations.map((destination) => {
          const rec = recommendations.find((r) => r.destinationId === destination.id);
          return (
            <Link
              key={destination.slug}
              href={`/destination/${destination.slug}`}
              onClick={(e) => {
                if (onDestinationClick) {
                  e.preventDefault();
                  onDestinationClick(destination);
                }
              }}
              className={`${CARD_WRAPPER} cursor-pointer text-left group relative flex flex-col`}
            >
              {/* AI Match Badge */}
              {rec && rec.score > 0.7 && (
                <div className="absolute top-2 right-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-20 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  <span>Match</span>
                </div>
              )}

              {/* Image Container */}
              <div className={`${CARD_MEDIA} mb-2 relative overflow-hidden`}>
                {destination.image ? (
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    quality={80}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                    <MapPin className="h-12 w-12 opacity-20" />
                  </div>
                )}

                {/* Michelin Stars */}
                {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5 z-10">
                    <Image
                      src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                      alt="Michelin star"
                      width={12}
                      height={12}
                      className="h-3 w-3"
                    />
                    <span>{destination.michelin_stars}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-0 flex-1 flex flex-col">
                <h3 className={`${CARD_TITLE} line-clamp-2 min-h-[2.5rem]`}>{destination.name}</h3>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1">
                  {destination.micro_description || 
                   (destination.category && destination.city 
                     ? `${destination.category} in ${destination.city
                         .split('-')
                         .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                         .join(' ')}`
                     : destination.city 
                       ? destination.city
                         .split('-')
                         .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                         .join(' ')
                       : destination.category || '')}
                </div>
              </div>

              {/* AI Reason (tooltip on hover) */}
              {rec && rec.reason && (
                <div className="absolute inset-0 bg-black/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center p-4 z-30">
                  <p className="text-white text-xs text-center font-medium">{rec.reason}</p>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const PersonalizedRecommendations = memo(PersonalizedRecommendationsComponent);

