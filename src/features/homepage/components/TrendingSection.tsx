'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { useHomepageData } from './HomepageDataProvider';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * Trending Section - Shows popular/featured destinations
 *
 * Displays a horizontally scrolling row of featured destinations:
 * - Editor's picks (crown)
 * - Michelin starred
 * - Top rated
 */

interface DestinationCardProps {
  destination: Destination;
  onSelect: (destination: Destination) => void;
  priority?: boolean;
}

function DestinationCard({ destination, onSelect, priority = false }: DestinationCardProps) {
  const imageUrl = destination.image_thumbnail || destination.image;

  return (
    <button
      onClick={() => onSelect(destination)}
      className="group flex-shrink-0 w-[280px] sm:w-[320px] text-left"
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800/50 mb-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            sizes="320px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            quality={85}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <MapPin className="h-10 w-10 opacity-30" />
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {destination.crown && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium
                           bg-amber-500/90 text-white backdrop-blur-sm">
              Editor's Pick
            </span>
          )}
          {typeof destination.michelin_stars === 'number' && destination.michelin_stars > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium
                           bg-white/90 dark:bg-black/70 backdrop-blur-md
                           text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <img src="/michelin-star.svg" alt="" className="h-3 w-3" />
              {destination.michelin_stars}
            </span>
          )}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-[15px] font-semibold text-white line-clamp-1 mb-0.5">
            {destination.name}
          </h3>
          <p className="text-[13px] text-white/80 line-clamp-1">
            {capitalizeCategory(destination.category)} in {capitalizeCity(destination.city)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function TrendingSection() {
  const { destinations, openDestination, isLoading } = useHomepageData();

  // Get featured destinations: Editor's picks, Michelin starred, or top rated
  const trendingDestinations = useMemo(() => {
    if (!destinations.length) return [];

    // Priority 1: Editor's picks
    const editorsPicks = destinations.filter(d => d.crown === true);

    // Priority 2: Michelin starred
    const michelin = destinations.filter(
      d => d.michelin_stars && d.michelin_stars > 0 && !d.crown
    );

    // Priority 3: Top rated (rating >= 4.5)
    const topRated = destinations
      .filter(d => d.rating && d.rating >= 4.5 && !d.crown && !(d.michelin_stars && d.michelin_stars > 0))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Combine and take first 8
    const combined = [...editorsPicks, ...michelin, ...topRated];

    // Shuffle slightly for variety but keep editors picks first
    const shuffled = [
      ...editorsPicks.slice(0, 3),
      ...michelin.slice(0, 3),
      ...topRated.slice(0, 4),
    ];

    return shuffled.slice(0, 8);
  }, [destinations]);

  if (isLoading || trendingDestinations.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 md:px-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            Trending Destinations
          </h2>
        </div>
        <button className="flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontally scrolling cards */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 md:px-10 pb-2 -mb-2">
          {trendingDestinations.map((destination, index) => (
            <DestinationCard
              key={destination.slug}
              destination={destination}
              onSelect={openDestination}
              priority={index < 3}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrendingSection;
