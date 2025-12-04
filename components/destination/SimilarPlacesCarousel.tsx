'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Star, Compass } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { Skeleton } from '@/components/ui/skeleton';

interface SimilarPlace {
  id?: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string | null;
  rating?: number | null;
  michelin_stars?: number | null;
  crown?: boolean;
  match_score?: number;
}

interface SimilarPlacesCarouselProps {
  places: SimilarPlace[];
  loading?: boolean;
  title?: string;
  sourceSlug?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function SimilarPlacesCarousel({
  places,
  loading = false,
  title = 'Similar Places',
  sourceSlug,
}: SimilarPlacesCarouselProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-[200px] md:w-[240px] space-y-3">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!places.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>

        {/* Navigation buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {places.map((place) => (
          <button
            key={place.slug}
            onClick={() => {
              trackEvent({
                event_type: 'click',
                destination_slug: place.slug,
                metadata: {
                  source: 'similar_places_carousel',
                  source_slug: sourceSlug,
                  category: place.category,
                  city: place.city,
                  match_score: place.match_score,
                },
              });
              router.push(`/destination/${place.slug}`);
            }}
            className="flex-shrink-0 w-[200px] md:w-[240px] text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white rounded-xl"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
              {place.image ? (
                <Image
                  src={place.image}
                  alt={`${place.name} - ${place.category} in ${place.city}`}
                  fill
                  sizes="(max-width: 768px) 200px, 240px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <MapPin className="w-10 h-10" />
                </div>
              )}

              {/* Michelin badge */}
              {place.michelin_stars && place.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg text-xs font-medium flex items-center gap-1">
                  <img
                    src="/michelin-star.svg"
                    alt="Michelin star"
                    className="w-3 h-3"
                  />
                  {place.michelin_stars}
                </div>
              )}

              {/* Rating badge */}
              {place.rating && !place.michelin_stars && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {place.rating.toFixed(1)}
                </div>
              )}

              {/* Match score indicator */}
              {place.match_score && place.match_score > 0.8 && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-lg text-xs font-medium text-white">
                  Great match
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors line-clamp-1">
                {place.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {capitalizeCity(place.city)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                {place.category}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
