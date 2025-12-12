'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star, Building2, Instagram } from 'lucide-react';
import { Destination } from '@/types/destination';

/**
 * InspectorHero - Unified hero section for destination detail views
 *
 * Displays the destination image, title, category, and badges.
 * Used in both:
 * - Homepage floating drawer (DestinationDrawer)
 * - Trip Studio pinned right panel
 *
 * This component ensures visual consistency across all place detail views.
 */

export interface InspectorHeroProps {
  destination: Destination;
  /** Enriched data from Google Places API */
  enrichedData?: {
    rating?: number;
    user_ratings_total?: number;
    [key: string]: unknown;
  } | null;
  /** Whether to show a compact version (smaller image, tighter spacing) */
  compact?: boolean;
  /** Custom aspect ratio for the image (default: "4/3") */
  imageAspect?: string;
  /** Callback when city link is clicked */
  onCityClick?: (city: string) => void;
  /** Additional className for the container */
  className?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatHighlightTag(tag: string): string {
  return tag
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function InspectorHero({
  destination,
  enrichedData,
  compact = false,
  imageAspect = '4/3',
  onCityClick,
  className = '',
}: InspectorHeroProps) {
  const rating = enrichedData?.rating || destination.rating;

  const handleCityClick = (e: React.MouseEvent) => {
    if (onCityClick) {
      e.preventDefault();
      e.stopPropagation();
      onCityClick(destination.city);
    }
  };

  return (
    <div className={className}>
      {/* Hero Image */}
      {destination.image && (
        <div
          className={`rounded-2xl overflow-hidden ${compact ? 'aspect-[16/9]' : `aspect-[${imageAspect}]`}`}
          style={{ aspectRatio: compact ? '16/9' : imageAspect.replace('/', ' / ') }}
        >
          <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800">
            <Image
              src={destination.image}
              alt={destination.name}
              fill
              className="object-cover"
              sizes={compact ? '300px' : '(max-width: 640px) 100vw, 420px'}
              priority={false}
              quality={85}
            />
          </div>
        </div>
      )}

      {/* Primary Info Block */}
      <div className={`space-y-4 ${destination.image ? 'mt-6' : ''}`}>
        {/* City Link - Pill style */}
        {destination.city && (
          <div>
            <Link
              href={`/city/${destination.city}`}
              className="inline-flex items-center px-3 h-[28px] rounded-lg border border-gray-200 dark:border-white/20 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1A1C1F] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              onClick={handleCityClick}
            >
              {destination.country
                ? `${capitalizeCity(destination.city)}, ${destination.country}`
                : capitalizeCity(destination.city)}
            </Link>
          </div>
        )}

        {/* Title & Category */}
        <div className="space-y-3">
          <h1
            className={`font-medium leading-tight text-black dark:text-white ${
              compact ? 'text-xl' : 'text-2xl'
            }`}
          >
            {destination.name}
          </h1>

          {/* Category - Subtle caps */}
          {destination.category && (
            <div className="text-xs uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 font-medium">
              {destination.category}
            </div>
          )}

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {rating.toFixed(1)}
              </span>
              {enrichedData?.user_ratings_total && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({enrichedData.user_ratings_total.toLocaleString()} reviews)
                </span>
              )}
            </div>
          )}

          {/* Tags - Small pills */}
          {destination.tags &&
            Array.isArray(destination.tags) &&
            destination.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {destination.tags.slice(0, 5).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] text-gray-600 dark:text-gray-400"
                  >
                    {formatHighlightTag(tag)}
                  </span>
                ))}
              </div>
            )}

          {/* Badges: Brand, Crown, Michelin, Rating, Instagram */}
          <div className="flex flex-wrap gap-2">
            {destination.brand && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                <Building2 className="h-3.5 w-3.5" />
                {destination.brand}
              </span>
            )}

            {destination.crown && (
              <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400">
                Crown
              </span>
            )}

            {destination.michelin_stars && destination.michelin_stars > 0 && (
              <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <img
                  src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                  alt="Michelin star"
                  className="h-3 w-3"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== '/michelin-star.svg') {
                      target.src = '/michelin-star.svg';
                    }
                  }}
                />
                {destination.michelin_stars} Michelin star
                {destination.michelin_stars > 1 ? 's' : ''}
              </span>
            )}

            {rating && (
              <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {rating.toFixed(1)}
              </span>
            )}

            {/* Instagram Handle */}
            {(destination.instagram_handle || destination.instagram_url) &&
              (() => {
                const instagramHandle =
                  destination.instagram_handle ||
                  destination.instagram_url?.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '');
                const instagramUrl =
                  destination.instagram_url ||
                  (instagramHandle
                    ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/`
                    : null);

                if (!instagramHandle || !instagramUrl) return null;

                return (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-3 w-3" />@{instagramHandle.replace('@', '')}
                  </a>
                );
              })()}
          </div>

          {/* Description */}
          {destination.micro_description && (
            <p
              className={`text-gray-700 dark:text-gray-300 leading-relaxed ${
                compact ? 'text-xs' : 'text-sm'
              }`}
            >
              {destination.micro_description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default InspectorHero;
