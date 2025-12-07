'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Instagram } from 'lucide-react';
import { Destination } from '@/types/destination';

interface DestinationIdentityProps {
  destination: Destination;
  enrichedData?: {
    rating?: number;
    [key: string]: any;
  } | null;
  className?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * DestinationIdentity - Title, category, badges section
 *
 * Displays:
 * - City link pill
 * - Destination name (title)
 * - Category, brand, crown, michelin stars badges
 * - Google rating
 * - Instagram handle
 * - Micro description
 */
export function DestinationIdentity({ destination, enrichedData, className = '' }: DestinationIdentityProps) {
  const router = useRouter();
  const rating = enrichedData?.rating || destination.rating;

  // Extract Instagram handle
  const instagramHandle = destination.instagram_handle ||
    (destination.instagram_url
      ? destination.instagram_url.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '')
      : null);
  const instagramUrl = destination.instagram_url ||
    (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/` : null);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* City Link - Pill style */}
      {destination.city && (
        <div>
          <Link
            href={`/city/${destination.city}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MapPin className="h-3 w-3" />
            {destination.country
              ? `${capitalizeCity(destination.city)}, ${destination.country}`
              : capitalizeCity(destination.city)
            }
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {/* Title */}
        <h1 className="text-2xl font-medium leading-tight text-black dark:text-white">
          {destination.name}
        </h1>

        {/* Pills: Category, Brand, Crown, Michelin, Rating, Instagram */}
        <div className="flex flex-wrap gap-2">
          {destination.category && (
            <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 capitalize">
              {destination.category}
            </span>
          )}

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
              {destination.michelin_stars} Michelin star{destination.michelin_stars > 1 ? 's' : ''}
            </span>
          )}

          {rating && (
            <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {rating.toFixed(1)}
            </span>
          )}

          {instagramHandle && instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram className="h-3 w-3" />
              @{instagramHandle.replace('@', '')}
            </a>
          )}
        </div>

        {/* Micro Description */}
        {destination.micro_description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {destination.micro_description}
          </p>
        )}
      </div>
    </div>
  );
}
