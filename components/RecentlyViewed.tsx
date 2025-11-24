'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useAuth } from '@/contexts/AuthContext';
import { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import { capitalizeCity } from '@/lib/utils';

interface RecentlyViewedProps {
  onCardClick?: (destination: Destination) => void;
}

export function RecentlyViewed({ onCardClick }: RecentlyViewedProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { recentlyViewed } = useRecentlyViewed();
  const [enhancedRecommendations, setEnhancedRecommendations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch Discovery Engine recommendations based on view history
  useEffect(() => {
    if (recentlyViewed.length > 0 && user?.id) {
      setLoading(true);
      
      // Get categories and cities from recently viewed
      const categories = [...new Set(recentlyViewed.map(item => item.category))];
      const cities = [...new Set(recentlyViewed.map(item => item.city))];
      
      // Fetch Discovery Engine recommendations based on view history
      fetch('/api/discovery/recommendations/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          context: {
            category: categories[0] || null,
            city: cities[0] || null,
            pageSize: 6,
          },
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.recommendations && data.recommendations.length > 0) {
            // Transform Discovery Engine results to Destination format
            const transformed = data.recommendations.map((rec: any) => ({
              id: rec.id || parseInt(rec.slug) || 0,
              slug: rec.slug || rec.id,
              name: rec.name,
              city: rec.city,
              category: rec.category,
              image: rec.images?.[0] || rec.image,
              rating: rec.rating || 0,
              price_level: rec.priceLevel || rec.price_level || 0,
              michelin_stars: rec.michelin_stars || 0,
            }));
            setEnhancedRecommendations(transformed);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [recentlyViewed, user?.id]);

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500">
          Recently Viewed
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {recentlyViewed.map((item) => (
          <button
            key={item.slug}
            onClick={async () => {
              // Track click event to Discovery Engine for personalization
              if (user?.id) {
                try {
                  await fetch('/api/discovery/track-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.id,
                      eventType: 'click',
                      documentId: item.slug,
                      source: 'recently_viewed',
                    }),
                  });
                } catch (error) {
                  console.warn('Discovery Engine tracking error:', error);
                }
              }
              
              if (onCardClick) {
                onCardClick(item as Destination);
              } else {
                router.push(`/destination/${item.slug}`);
              }
            }}
            className={`${CARD_WRAPPER} text-left`}
          >
            <div className={`${CARD_MEDIA} mb-2`}>
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-12 w-12 opacity-20" />
                </div>
              )}
              {item.michelin_stars && item.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  <span>{item.michelin_stars}</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <h3 className={CARD_TITLE}>{item.name}</h3>
              <div className={CARD_META}>
                <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {capitalizeCity(item.city)}
                </span>
                {item.category && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                      {item.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
