import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import {
  CARD_WRAPPER,
  CARD_MEDIA,
  CARD_TITLE,
  CARD_META,
  CARD_IMAGE_HOVER,
  CARD_BADGE,
} from '@/components/CardStyles';

/**
 * Server-Rendered Destination Grid - Apple Design System
 *
 * Pure server component rendering the destination grid without JavaScript.
 * Uses Apple-inspired card design with clean typography and subtle interactions.
 *
 * Features:
 * - Zero JavaScript for initial render
 * - Optimized image loading with priority for first 6 items
 * - Responsive grid layout
 * - Click handling delegated to client wrapper
 */

interface ServerDestinationGridProps {
  destinations: Destination[];
  /** Number of items to render (default: all) */
  limit?: number;
}

/**
 * Server-rendered destination card - Apple-style clean card
 */
function ServerDestinationCard({
  destination,
  index,
  priority = false,
}: {
  destination: Destination;
  index: number;
  priority?: boolean;
}) {
  const imageUrl = destination.image_thumbnail || destination.image;

  return (
    <article
      data-destination-slug={destination.slug}
      className={CARD_WRAPPER}
    >
      {/* Image Container - Apple-style rounded corners */}
      <div className={CARD_MEDIA}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={CARD_IMAGE_HOVER}
            quality={85}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <MapPin className="h-10 w-10 opacity-30" />
          </div>
        )}

        {/* Michelin Stars Badge */}
        {typeof destination.michelin_stars === 'number' &&
          destination.michelin_stars > 0 && (
            <div className={CARD_BADGE}>
              <img
                src="/michelin-star.svg"
                alt="Michelin star"
                className="h-3 w-3"
              />
              <span>{destination.michelin_stars}</span>
            </div>
          )}
      </div>

      {/* Info Section - Apple-style clean typography */}
      <div className="flex-1 flex flex-col">
        <h3 className={CARD_TITLE}>
          {destination.name}
        </h3>
        <p className={CARD_META}>
          {destination.micro_description ||
            (destination.category && destination.city
              ? `${destination.category} in ${capitalizeCity(destination.city)}`
              : destination.city
                ? capitalizeCity(destination.city)
                : destination.category || '')}
        </p>
      </div>
    </article>
  );
}

/**
 * Server-rendered destination grid
 *
 * Renders the grid layout with all destinations as static HTML.
 * Interactivity (click handlers, hover effects) is added by ClientGridWrapper.
 */
export function ServerDestinationGrid({
  destinations,
  limit,
}: ServerDestinationGridProps) {
  const displayedDestinations = limit
    ? destinations.slice(0, limit)
    : destinations;

  if (displayedDestinations.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-5 md:gap-6 lg:gap-7 items-start">
      {displayedDestinations.map((destination, index) => (
        <ServerDestinationCard
          key={destination.slug}
          destination={destination}
          index={index}
          priority={index < 6}
        />
      ))}
    </div>
  );
}

export default ServerDestinationGrid;
