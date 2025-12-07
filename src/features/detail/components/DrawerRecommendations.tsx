'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Loader2 } from 'lucide-react';
import { Destination } from '@/types/destination';

interface DrawerRecommendationsProps {
  destinationSlug: string;
  isOpen: boolean;
  onDestinationClick?: (destination: Destination) => void;
  className?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * DrawerRecommendations - AI-powered recommendations for similar destinations
 *
 * Fetches and displays similar destinations in a horizontal scrolling list.
 */
export function DrawerRecommendations({
  destinationSlug,
  isOpen,
  onDestinationClick,
  className = '',
}: DrawerRecommendationsProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRecommendations() {
      if (!destinationSlug || !isOpen) {
        setRecommendations([]);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`/api/recommendations?slug=${destinationSlug}&limit=6`);

        // If unauthorized, try fallback
        if (response.status === 401 || response.status === 403) {
          await loadFallback();
          return;
        }

        if (!response.ok) {
          await loadFallback();
          return;
        }

        const data = await response.json();

        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(
            data.recommendations
              .map((rec: any) => rec.destination || rec)
              .filter(Boolean)
          );
        } else {
          setRecommendations([]);
        }
      } catch {
        await loadFallback();
      } finally {
        setLoading(false);
      }
    }

    async function loadFallback() {
      try {
        const relatedResponse = await fetch(`/api/related-destinations?slug=${destinationSlug}&limit=6`);
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          if (relatedData.related) {
            setRecommendations(
              relatedData.related.map((dest: any) => ({
                slug: dest.slug,
                name: dest.name,
                city: dest.city,
                category: dest.category,
                image: dest.image,
                michelin_stars: dest.michelin_stars,
                crown: dest.crown,
              }))
            );
          }
        }
      } catch {
        setRecommendations([]);
      }
    }

    loadRecommendations();
  }, [destinationSlug, isOpen]);

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <div className={`border-t border-gray-200 dark:border-gray-800 pt-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
          You might also like
        </h3>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-32">
              <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
          {recommendations.map(rec => (
            <button
              key={rec.slug}
              onClick={() => {
                if (rec.slug && rec.slug.trim()) {
                  if (onDestinationClick) {
                    onDestinationClick(rec);
                  } else {
                    router.push(`/destination/${rec.slug}`);
                  }
                }
              }}
              className="group text-left flex-shrink-0 w-32 flex flex-col"
            >
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-800">
                {rec.image ? (
                  <Image
                    src={rec.image}
                    alt={rec.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover group-hover:opacity-90 transition-opacity"
                    quality={85}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 opacity-20" />
                  </div>
                )}
                {rec.michelin_stars && rec.michelin_stars > 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1">
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
                    <span>{rec.michelin_stars}</span>
                  </div>
                )}
              </div>
              <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1 text-black dark:text-white">
                {rec.name}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {rec.city && capitalizeCity(rec.city)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
