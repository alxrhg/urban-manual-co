'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Star,
  Bookmark,
  Share2,
  Navigation,
  ExternalLink,
  Clock,
  Phone,
  Globe,
  Building2,
  DollarSign,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

interface DestinationContentProps {
  destination: Destination;
  related?: Destination[];
  whyThis?: string;
  tripContext?: {
    day?: number;
    fit?: string;
  };
  onOpenRelated: (destination: Destination) => void;
  onShowSimilar: () => void;
  onShowWhyThis: () => void;
}

/**
 * DestinationContent - Smart, integrated destination view
 *
 * Everything is inline - no extra pages or navigation buttons
 * Shows all relevant information in one scrollable view
 */
const DestinationContent = memo(function DestinationContent({
  destination,
  related = [],
  onOpenRelated,
}: DestinationContentProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [similarPlaces, setSimilarPlaces] = useState<Destination[]>([]);
  const { activeTrip, addToTrip } = useTripBuilder();

  const imageUrl = destination.image || destination.image_thumbnail;

  // Fetch similar places inline
  useEffect(() => {
    if (destination.slug) {
      fetch(`/api/intelligence/similar?slug=${destination.slug}&limit=4&filter=all`)
        .then(res => res.ok ? res.json() : { similar: [] })
        .then(data => setSimilarPlaces(data.similar || []))
        .catch(() => setSimilarPlaces([]));
    }
  }, [destination.slug]);

  // Parse opening hours
  const openingHours = parseOpeningHours(destination.opening_hours_json);
  const isOpenNow = checkIfOpen(openingHours);

  // Handle share
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: destination.name, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [destination]);

  // Handle directions
  const handleDirections = useCallback(() => {
    if (!destination.latitude || !destination.longitude) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
      '_blank'
    );
  }, [destination]);

  return (
    <div className="pb-6">
      {/* Hero Image */}
      <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <Image src={imageUrl} alt={destination.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-white/95 text-[11px] font-medium text-gray-800 flex items-center gap-1">
              <img src="/michelin-star.svg" alt="" className="w-3 h-3" />
              {destination.michelin_stars}★
            </span>
          )}
          {destination.crown && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-[11px] font-medium text-white flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
            </span>
          )}
          {isOpenNow !== null && (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
              isOpenNow ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'
            }`}>
              {isOpenNow ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
      </div>

      <div className="px-5">
        {/* Title */}
        <div className="py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {destination.name}
          </h2>
          <div className="flex items-center gap-2 text-[14px] text-gray-500">
            <span>{capitalizeCategory(destination.category || '')}</span>
            <span>·</span>
            <span>{capitalizeCity(destination.city || '')}</span>
            {destination.rating && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {destination.rating.toFixed(1)}
                </span>
              </>
            )}
            {destination.price_level && (
              <>
                <span>·</span>
                <span className="text-green-600 dark:text-green-400">
                  {'$'.repeat(destination.price_level)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions - Compact */}
        <div className="flex gap-3 py-4 border-b border-gray-100 dark:border-white/10">
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              isSaved
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          {destination.latitude && destination.longitude && (
            <button
              onClick={handleDirections}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-[13px] font-medium text-gray-700 dark:text-gray-300"
            >
              <Navigation className="w-4 h-4" />
              Go
            </button>
          )}
        </div>

        {/* Description */}
        {(destination.micro_description || destination.description) && (
          <p className="py-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-white/10">
            {destination.micro_description || destination.description}
          </p>
        )}

        {/* Details Grid */}
        <div className="py-4 space-y-3 border-b border-gray-100 dark:border-white/10">
          {/* Opening Hours */}
          {openingHours && openingHours.length > 0 && (
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 dark:text-white mb-1">Hours</p>
                <div className="text-[12px] text-gray-500 space-y-0.5">
                  {openingHours.slice(0, 3).map((hour, i) => (
                    <p key={i}>{hour}</p>
                  ))}
                  {openingHours.length > 3 && (
                    <p className="text-gray-400">+{openingHours.length - 3} more days</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {destination.formatted_address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-600 dark:text-gray-400">
                  {destination.formatted_address}
                </p>
              </div>
            </div>
          )}

          {/* Phone */}
          {destination.phone_number && (
            <a
              href={`tel:${destination.phone_number}`}
              className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                {destination.phone_number}
              </p>
            </a>
          )}

          {/* Website */}
          {destination.website && (
            <a
              href={destination.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-[13px] text-gray-600 dark:text-gray-400 truncate">
                {new URL(destination.website).hostname.replace('www.', '')}
              </p>
            </a>
          )}

          {/* Architect */}
          {destination.architect && (
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[12px] text-gray-400">Architecture</p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300">{destination.architect}</p>
              </div>
            </div>
          )}
        </div>

        {/* Map Preview - Simple styled link */}
        {destination.latitude && destination.longitude && (
          <div className="py-4 border-b border-gray-100 dark:border-white/10">
            <a
              href={destination.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                  View on Map
                </p>
                <p className="text-[12px] text-gray-500">
                  {destination.neighborhood || destination.city || 'Get directions'}
                </p>
              </div>
              <Navigation className="w-5 h-5 text-gray-400" />
            </a>
          </div>
        )}

        {/* Add to Trip - Only show if active trip */}
        {activeTrip && (
          <div className="py-4 border-b border-gray-100 dark:border-white/10">
            <p className="text-[12px] text-gray-400 uppercase tracking-wide mb-2">Add to Trip</p>
            <div className="flex gap-2 flex-wrap">
              {activeTrip.days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => addToTrip(destination, day.dayNumber)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Similar Places - Inline */}
        {similarPlaces.length > 0 && (
          <div className="py-4 border-b border-gray-100 dark:border-white/10">
            <p className="text-[12px] text-gray-400 uppercase tracking-wide mb-3">Similar Places</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
              {similarPlaces.map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="flex-shrink-0 w-28 text-left group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
                    {(dest.image || dest.image_thumbnail) && (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">
                    {dest.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {capitalizeCategory(dest.category || '')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* More in City - Related */}
        {related.length > 0 && (
          <div className="py-4 border-b border-gray-100 dark:border-white/10">
            <p className="text-[12px] text-gray-400 uppercase tracking-wide mb-3">
              More in {capitalizeCity(destination.city || '')}
            </p>
            <div className="space-y-2">
              {related.slice(0, 3).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="flex items-center gap-3 w-full p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {(dest.image || dest.image_thumbnail) && (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                      {dest.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {capitalizeCategory(dest.category || '')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Full Page */}
        <div className="py-4">
          <Link
            href={`/destination/${destination.slug}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Page
          </Link>
        </div>
      </div>
    </div>
  );
});

/**
 * Parse opening hours from JSON
 */
function parseOpeningHours(json: Record<string, unknown> | null | undefined): string[] | null {
  if (!json) return null;

  // Handle different formats from Google Places API
  if (Array.isArray(json)) {
    return json.map(String);
  }

  if (typeof json === 'object' && 'weekday_text' in json && Array.isArray(json.weekday_text)) {
    return json.weekday_text as string[];
  }

  return null;
}

/**
 * Check if currently open based on opening hours
 */
function checkIfOpen(hours: string[] | null): boolean | null {
  if (!hours || hours.length === 0) return null;

  // Simple check - look for today's entry and see if current time fits
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[now.getDay()];

  const todayHours = hours.find(h => h.startsWith(today));
  if (!todayHours) return null;

  // Very simple check - if it says "Closed" it's closed
  if (todayHours.includes('Closed')) return false;

  // Otherwise assume open (more complex time parsing would be needed for accuracy)
  return true;
}

export default DestinationContent;
