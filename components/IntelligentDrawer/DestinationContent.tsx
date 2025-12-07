'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Star,
  Bookmark,
  Share2,
  Navigation,
  ExternalLink,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  Users,
  Lightbulb,
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
 * DestinationContent - Rich destination view with intelligence
 *
 * Shows destination details with:
 * - Hero image with badges
 * - Quick actions (save, share, directions, add to trip)
 * - AI insights (why this, similar places)
 * - Trip integration (add to specific day)
 * - Related destinations
 */
const DestinationContent = memo(function DestinationContent({
  destination,
  related = [],
  whyThis,
  tripContext,
  onOpenRelated,
  onShowSimilar,
  onShowWhyThis,
}: DestinationContentProps) {
  const [isSaved, setIsSaved] = useState(false);
  const { activeTrip, addToTrip, totalItems } = useTripBuilder();

  const imageUrl = destination.image || destination.image_thumbnail;
  const hasTrip = activeTrip && totalItems > 0;

  // Handle share
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: destination.name,
          text: destination.micro_description || `Check out ${destination.name}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [destination]);

  // Handle directions
  const handleDirections = useCallback(() => {
    if (!destination.latitude || !destination.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    window.open(url, '_blank');
  }, [destination]);

  // Handle add to trip
  const handleAddToTrip = useCallback(
    (day?: number) => {
      addToTrip(destination, day);
    },
    [addToTrip, destination]
  );

  return (
    <div className="pb-6">
      {/* Hero Image */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <div className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md text-[12px] font-medium text-gray-800 dark:text-white flex items-center gap-1.5">
              <img src="/michelin-star.svg" alt="Michelin" className="w-3.5 h-3.5" />
              {destination.michelin_stars} Star{destination.michelin_stars > 1 ? 's' : ''}
            </div>
          )}
          {destination.crown && (
            <div className="px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-md text-[12px] font-medium text-white flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              Crown
            </div>
          )}
        </div>

        {/* Trip fit badge */}
        {tripContext?.fit && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-green-500/90 backdrop-blur-md text-[11px] font-medium text-white flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {tripContext.fit}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5">
        {/* Title & Category */}
        <div className="py-4">
          <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight mb-1">
            {destination.name}
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-gray-400">
            {destination.category && capitalizeCategory(destination.category)}
            {destination.category && destination.city && ' · '}
            {destination.city && capitalizeCity(destination.city)}
            {destination.neighborhood && `, ${destination.neighborhood}`}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-5">
          <ActionButton
            icon={<Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />}
            label={isSaved ? 'Saved' : 'Save'}
            active={isSaved}
            onClick={() => setIsSaved(!isSaved)}
          />
          <ActionButton
            icon={<Share2 className="w-4 h-4" />}
            label="Share"
            onClick={handleShare}
          />
          {destination.latitude && destination.longitude && (
            <ActionButton
              icon={<Navigation className="w-4 h-4" />}
              label="Directions"
              onClick={handleDirections}
            />
          )}
        </div>

        {/* Add to Trip - Smart */}
        {activeTrip && (
          <div className="mb-5 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-500" />
                <span className="text-[14px] font-medium text-gray-900 dark:text-white">
                  Add to {activeTrip.title}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeTrip.days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => handleAddToTrip(day.dayNumber)}
                  className={`
                    px-4 py-2 rounded-xl text-[13px] font-medium
                    transition-all hover:scale-[1.02] active:scale-[0.98]
                    ${tripContext?.day === day.dayNumber
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  Day {day.dayNumber}
                  {tripContext?.day === day.dayNumber && (
                    <span className="ml-1 text-[11px] opacity-80">Best fit</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence Cards */}
        <div className="space-y-3 mb-5">
          {/* Why This */}
          {whyThis && (
            <button
              onClick={onShowWhyThis}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 text-left hover:opacity-90 transition-opacity"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-white mb-0.5">
                    Why this?
                  </p>
                  <p className="text-[12px] text-gray-600 dark:text-gray-400 line-clamp-2">
                    {whyThis}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </button>
          )}

          {/* Similar Places */}
          <button
            onClick={onShowSimilar}
            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 text-left hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">
                  Find similar places
                </p>
                <p className="text-[12px] text-gray-500">
                  Discover more like this
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </div>

        {/* Description */}
        {(destination.micro_description || destination.description) && (
          <div className="mb-5">
            <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
              {destination.micro_description || destination.description}
            </p>
          </div>
        )}

        {/* Details */}
        <div className="border-t border-gray-200 dark:border-white/10 pt-4 mb-5">
          {destination.rating && (
            <DetailRow
              label="Rating"
              value={
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{destination.rating.toFixed(1)}</span>
                </div>
              }
            />
          )}
          {destination.price_level && (
            <DetailRow
              label="Price"
              value={'$'.repeat(destination.price_level)}
            />
          )}
          {destination.tags && destination.tags.length > 0 && (
            <div className="py-3">
              <span className="text-[15px] text-gray-500 dark:text-gray-400 block mb-2">
                Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {destination.tags.slice(0, 5).map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-[13px] text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View Full Page */}
        <Link
          href={`/destination/${destination.slug}`}
          className="flex items-center justify-between w-full py-4 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors mb-5"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="w-5 h-5 text-gray-400" />
            <span className="text-[15px] font-medium text-gray-900 dark:text-white">
              View full page
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Related Destinations */}
        {related.length > 0 && (
          <div>
            <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              More in {capitalizeCity(destination.city || '')}
            </h3>
            <div className="space-y-2">
              {related.slice(0, 4).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {(dest.image || dest.image_thumbnail) && (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                      {dest.name}
                    </p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                      {dest.category && capitalizeCategory(dest.category)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Action button component
 */
function ActionButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 h-11 rounded-xl text-[14px] font-medium
        flex items-center justify-center gap-2 transition-all
        ${active
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Detail row component
 */
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
      <span className="text-[15px] text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-[15px] font-medium text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

export default DestinationContent;
