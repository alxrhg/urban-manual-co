import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

/**
 * Server-Rendered Destination Grid
 *
 * This component renders the destination grid entirely on the server,
 * providing instant visual content without JavaScript.
 *
 * Features:
 * - Zero JavaScript for initial render
 * - Optimized image loading with priority for first 6 items
 * - Responsive grid layout matching the client grid
 * - Click handling delegated to client wrapper
 */

interface ServerDestinationGridProps {
  destinations: Destination[];
  /** Number of items to render (default: all) */
  limit?: number;
}

/**
 * Server-rendered destination card - no interactivity, just HTML
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
      className="group relative w-full flex flex-col"
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 mb-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            quality={80}
            loading={priority ? 'eager' : 'lazy'}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="h-12 w-12 opacity-20" />
          </div>
        )}

        {/* Michelin Stars Badge */}
        {typeof destination.michelin_stars === 'number' &&
          destination.michelin_stars > 0 && (
            <div className="absolute bottom-2 left-2 z-10 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5 shadow-sm">
              <img
                src="/michelin-star.svg"
                alt="Michelin star"
                className="h-3 w-3"
              />
              <span>{destination.michelin_stars}</span>
            </div>
          )}
      </div>

      {/* Info Section */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
          {destination.name}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
          {destination.micro_description ||
            (destination.category && destination.city
              ? `${destination.category} in ${capitalizeCity(destination.city)}`
              : destination.city
                ? `Located in ${capitalizeCity(destination.city)}`
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-7 lg:gap-8 items-start">
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
