'use client';

import { useRouter } from 'next/navigation';
import { MapPin, Building2, Instagram, Star } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface DestinationIdentityProps {
  destination: Destination;
  enrichedData?: {
    rating?: number;
  } | null;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTag(tag: string): string {
  return tag
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DestinationIdentity({ destination, enrichedData }: DestinationIdentityProps) {
  const router = useRouter();
  const rating = enrichedData?.rating || destination.rating;

  // Extract Instagram info
  const instagramHandle = destination.instagram_handle ||
    (destination.instagram_url
      ? destination.instagram_url.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '')
      : null);
  const instagramUrl = destination.instagram_url ||
    (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/` : null);

  return (
    <div className="space-y-4">
      {/* Location Badge */}
      <button
        onClick={() => router.push(`/city/${destination.city}`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <MapPin className="h-3 w-3" />
        {destination.country
          ? `${capitalizeCity(destination.city)}, ${destination.country}`
          : capitalizeCity(destination.city)}
      </button>

      {/* Title & Category */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold leading-tight text-black dark:text-white">
          {destination.name}
        </h1>

        {destination.category && (
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
            {destination.category}
          </p>
        )}
      </div>

      {/* Micro description */}
      {destination.micro_description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {destination.micro_description}
        </p>
      )}

      {/* Pills Row */}
      <div className="flex flex-wrap gap-2">
        {/* Rating */}
        {rating && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            {rating.toFixed(1)}
          </span>
        )}

        {/* Michelin Stars */}
        {destination.michelin_stars && destination.michelin_stars > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            <img
              src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
              alt="Michelin"
              className="h-3 w-3"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== '/michelin-star.svg') {
                  target.src = '/michelin-star.svg';
                }
              }}
            />
            {destination.michelin_stars} Star{destination.michelin_stars > 1 ? 's' : ''}
          </span>
        )}

        {/* Brand */}
        {destination.brand && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            <Building2 className="h-3 w-3" />
            {destination.brand}
          </span>
        )}

        {/* Instagram */}
        {instagramHandle && instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Instagram className="h-3 w-3" />
            @{instagramHandle.replace('@', '')}
          </a>
        )}
      </div>

      {/* Tags */}
      {destination.tags && Array.isArray(destination.tags) && destination.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {destination.tags.slice(0, 5).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded-full text-[11px] text-gray-500 dark:text-gray-400"
            >
              {formatTag(tag)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
