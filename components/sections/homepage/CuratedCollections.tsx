'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, ChevronRight, Sparkles, Crown } from 'lucide-react';
import { Destination } from '@/types/destination';
import { Section } from '../Section';
import { Carousel, CarouselItem } from '@/components/ui/Carousel';
import { capitalizeCity } from '@/lib/utils';

interface CollectionCardProps {
  destination: Destination;
  onClick?: () => void;
  showBadge?: 'michelin' | 'new' | 'crown' | null;
}

/**
 * Compact card for use in collection carousels
 */
function CollectionCard({ destination, onClick, showBadge }: CollectionCardProps) {
  return (
    <button
      onClick={onClick}
      className="
        group relative flex flex-col text-left
        w-[220px] md:w-[260px]
        transition-transform duration-300
        hover:scale-[1.02] active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-xl
      "
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
        {destination.image_thumbnail || destination.image ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={destination.name}
            fill
            sizes="(max-width: 640px) 220px, 260px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="w-8 h-8" />
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badge - Michelin Stars */}
        {showBadge === 'michelin' && destination.michelin_stars && destination.michelin_stars > 0 && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full text-xs font-medium shadow-sm">
            <Star className="w-3 h-3 text-red-600 fill-red-600" />
            <span className="text-gray-900 dark:text-white">{destination.michelin_stars}</span>
          </div>
        )}

        {/* Badge - Crown */}
        {showBadge === 'crown' && destination.crown && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/80 backdrop-blur-sm rounded-full text-xs font-medium shadow-sm">
            <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-800 dark:text-amber-200">Featured</span>
          </div>
        )}

        {/* Badge - New */}
        {showBadge === 'new' && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/80 backdrop-blur-sm rounded-full text-xs font-medium shadow-sm">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-800 dark:text-blue-200">New</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {destination.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {capitalizeCity(destination.city)}
        </p>
      </div>
    </button>
  );
}

interface CollectionSectionProps {
  title: string;
  subtitle?: string;
  destinations: Destination[];
  viewAllHref?: string;
  showBadge?: 'michelin' | 'new' | 'crown' | null;
  onDestinationClick?: (destination: Destination) => void;
}

/**
 * Single collection carousel row
 */
function CollectionRow({
  title,
  subtitle,
  destinations,
  viewAllHref,
  showBadge,
  onDestinationClick,
}: CollectionSectionProps) {
  if (destinations.length === 0) return null;

  return (
    <Section
      title={title}
      subtitle={subtitle}
      viewAllHref={viewAllHref}
      className="py-8 md:py-12"
    >
      <Carousel gap={16} scrollCount={2}>
        {destinations.map((destination) => (
          <CarouselItem key={destination.slug || destination.id}>
            <CollectionCard
              destination={destination}
              showBadge={showBadge}
              onClick={() => onDestinationClick?.(destination)}
            />
          </CarouselItem>
        ))}
      </Carousel>
    </Section>
  );
}

interface CuratedCollectionsProps {
  destinations: Destination[];
  onDestinationClick?: (destination: Destination) => void;
}

/**
 * Curated Collections section
 * Displays multiple themed carousels of destinations
 */
export function CuratedCollections({ destinations, onDestinationClick }: CuratedCollectionsProps) {
  // Organize destinations into collections
  const collections = useMemo(() => {
    // Michelin starred restaurants
    const michelinExcellence = destinations
      .filter((d) => d.michelin_stars && d.michelin_stars > 0)
      .sort((a, b) => (b.michelin_stars || 0) - (a.michelin_stars || 0))
      .slice(0, 12);

    // Hotels
    const iconicHotels = destinations
      .filter((d) => d.category?.toLowerCase() === 'hotel')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);

    // Cafes
    const cafeCulture = destinations
      .filter((d) => d.category?.toLowerCase() === 'cafe')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);

    // Bars
    const cocktailBars = destinations
      .filter((d) => d.category?.toLowerCase() === 'bar')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);

    // Crown (featured) destinations
    const hiddenGems = destinations
      .filter((d) => d.crown)
      .slice(0, 12);

    // Culture & landmarks
    const culturalLandmarks = destinations
      .filter((d) => {
        const cat = d.category?.toLowerCase();
        return cat === 'culture' || cat === 'landmark' || cat === 'museum';
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);

    return {
      michelinExcellence,
      iconicHotels,
      cafeCulture,
      cocktailBars,
      hiddenGems,
      culturalLandmarks,
    };
  }, [destinations]);

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Michelin Excellence */}
      <CollectionRow
        title="Michelin Excellence"
        subtitle="World-class restaurants recognized for culinary mastery"
        destinations={collections.michelinExcellence}
        viewAllHref="/?category=restaurant&michelin=true"
        showBadge="michelin"
        onDestinationClick={onDestinationClick}
      />

      {/* Iconic Hotels */}
      <CollectionRow
        title="Iconic Hotels"
        subtitle="Unforgettable stays at legendary properties"
        destinations={collections.iconicHotels}
        viewAllHref="/?category=hotel"
        showBadge="crown"
        onDestinationClick={onDestinationClick}
      />

      {/* Cafe Culture */}
      <CollectionRow
        title="Cafe Culture"
        subtitle="The best coffee spots around the world"
        destinations={collections.cafeCulture}
        viewAllHref="/?category=cafe"
        onDestinationClick={onDestinationClick}
      />

      {/* Cocktail Bars */}
      {collections.cocktailBars.length > 0 && (
        <CollectionRow
          title="Cocktail Bars"
          subtitle="Exceptional drinks in remarkable settings"
          destinations={collections.cocktailBars}
          viewAllHref="/?category=bar"
          onDestinationClick={onDestinationClick}
        />
      )}

      {/* Hidden Gems */}
      {collections.hiddenGems.length > 0 && (
        <CollectionRow
          title="Hidden Gems"
          subtitle="Curated favorites off the beaten path"
          destinations={collections.hiddenGems}
          showBadge="crown"
          onDestinationClick={onDestinationClick}
        />
      )}

      {/* Cultural Landmarks */}
      {collections.culturalLandmarks.length > 0 && (
        <CollectionRow
          title="Cultural Landmarks"
          subtitle="Museums, galleries, and historic sites"
          destinations={collections.culturalLandmarks}
          viewAllHref="/?category=culture"
          onDestinationClick={onDestinationClick}
        />
      )}
    </div>
  );
}
