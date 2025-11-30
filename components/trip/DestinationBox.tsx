'use client';

import Image from 'next/image';
import { X, MapPin, Star, Globe, Phone, Clock, Navigation } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface DestinationBoxProps {
  item: EnrichedItineraryItem;
  onClose?: () => void;
  onRemove?: (id: string) => void;
  className?: string;
}

/**
 * DestinationBox - Inline destination details view
 * Shows place info in sidebar similar to AddPlaceBox
 */
export default function DestinationBox({
  item,
  onClose,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  const destination = item.destination;
  const notes = item.parsedNotes;

  if (!destination) {
    return (
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No destination data available
        </div>
      </div>
    );
  }

  const image = destination.image || destination.image_thumbnail;
  const rating = destination.rating;
  const priceLevel = destination.price_level;
  const address = destination.formatted_address;
  const website = destination.website;
  const phone = destination.phone_number;

  // Format price level as $ symbols
  const formatPriceLevel = (level?: number | null) => {
    if (!level || level < 1 || level > 4) return null;
    return '$'.repeat(level);
  };

  const priceDisplay = formatPriceLevel(priceLevel);

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Place Details
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Image */}
      {image && (
        <div className="relative w-full h-40">
          <Image
            src={image}
            alt={destination.name}
            fill
            className="object-cover"
            sizes="400px"
          />
          {/* Rating & Price overlay */}
          {(rating || priceDisplay) && (
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              {rating && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}
              {priceDisplay && (
                <div className="px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {priceDisplay}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Name & Category */}
        <div>
          <h4 className="text-lg font-medium text-black dark:text-white">
            {destination.name}
          </h4>
          {destination.category && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
              {destination.category}
            </p>
          )}
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}

        {/* Neighborhood */}
        {destination.neighborhood && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {destination.neighborhood}
          </div>
        )}

        {/* Description */}
        {destination.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {destination.description}
          </p>
        )}

        {/* Rating & Reviews (if no image) */}
        {!image && (rating || priceDisplay) && (
          <div className="flex items-center gap-3">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {rating.toFixed(1)}
                </span>
                {destination.user_ratings_total && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({destination.user_ratings_total.toLocaleString()})
                  </span>
                )}
              </div>
            )}
            {priceDisplay && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {priceDisplay}
              </span>
            )}
          </div>
        )}

        {/* Time in itinerary */}
        {item.time && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{item.time}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
          )}
          {destination.latitude && destination.longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Directions</span>
            </a>
          )}
        </div>

        {/* Notes */}
        {notes?.notes && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {notes.notes}
            </p>
          </div>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="w-full py-2 px-4 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Remove from trip
          </button>
        )}
      </div>
    </div>
  );
}
