'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown?: boolean;
}

interface SimilarPlacesGridProps {
  recommendations: Recommendation[];
  loading: boolean;
  destinationSlug: string;
  onDestinationClick?: (slug: string) => void;
  onClose: () => void;
}

function capitalizeCity(city: string): string {
  if (!city) return '';
  return city
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function SimilarPlacesGrid({
  recommendations,
  loading,
  destinationSlug,
  onDestinationClick,
  onClose,
}: SimilarPlacesGridProps) {
  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
          You might also like
        </h3>
        {recommendations.length > 4 && destinationSlug && (
          <Link
            href={`/destination/${destinationSlug}#similar`}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            See all →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col">
              <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {recommendations.slice(0, 4).map(rec => (
            <button
              type="button"
              key={rec.slug}
              onClick={() => {
                if (rec.slug && rec.slug.trim() && onDestinationClick) {
                  onDestinationClick(rec.slug);
                }
              }}
              className="group text-left flex flex-col"
            >
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2 border border-gray-200 dark:border-gray-800">
                {rec.image ? (
                  <Image
                    src={rec.image}
                    alt={rec.name}
                    fill
                    sizes="(max-width: 640px) 25vw, 100px"
                    className="object-cover group-hover:opacity-90 transition-opacity"
                    quality={85}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 opacity-20" />
                  </div>
                )}
                {rec.michelin_stars && rec.michelin_stars > 0 && (
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-400 text-[10px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-0.5">
                    <img
                      src="/michelin-star.svg"
                      alt="Michelin star"
                      className="h-2.5 w-2.5"
                    />
                    <span>{rec.michelin_stars}</span>
                  </div>
                )}
              </div>
              <h4 className="font-medium text-[11px] leading-tight line-clamp-2 mb-0.5 text-black dark:text-white">
                {rec.name}
              </h4>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {capitalizeCity(rec.city)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
