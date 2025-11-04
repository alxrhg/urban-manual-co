'use client';

import { useEffect, useState } from 'react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin, TrendingUp } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { useRouter } from 'next/navigation';

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  rating?: number;
  price_level?: number;
  michelin_stars?: number;
  is_open_now?: boolean;
  trend_percentage?: number;
  ml_trending?: boolean;
}

interface MLTrendingDestination {
  destination_id: number;
  trend_percentage: number;
  predicted_views: number;
  peak_date: string;
}

export function TrendingSection({ city }: { city?: string }) {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingML, setUsingML] = useState(false);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Try ML trending first
        const mlResponse = await fetch('/api/ml/forecast/trending?min_trend=0.15');

        if (mlResponse.ok) {
          const mlTrending: MLTrendingDestination[] = await mlResponse.json();

          if (mlTrending.length > 0) {
            // Fetch destination details
            const destIds = mlTrending.slice(0, 6).map(t => t.destination_id).join(',');
            const detailsResponse = await fetch(`/api/destinations?ids=${destIds}`);

            if (detailsResponse.ok) {
              const details: Destination[] = await detailsResponse.json();

              // Merge ML data with destination details
              const enrichedDests = details.map(dest => {
                const mlData = mlTrending.find(t => t.destination_id === dest.id);
                return {
                  ...dest,
                  trend_percentage: mlData?.trend_percentage,
                  ml_trending: true
                };
              });

              setDestinations(enrichedDests);
              setUsingML(true);
              setLoading(false);
              return;
            }
          }
        }
      } catch (error) {
        console.log('ML trending unavailable, falling back to rule-based');
      }

      // Fallback to existing trending API
      try {
        const params = new URLSearchParams();
        if (city) params.set('city', city);
        params.set('limit', '6');

        const response = await fetch(`/api/trending?${params}`);
        const data = await response.json();
        setDestinations(data.trending || []);
        setUsingML(false);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [city]);

  if (loading) return null;
  if (!destinations.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500 flex items-center gap-2">
          Trending This Week
          {usingML && (
            <span className="inline-flex items-center gap-1 text-xs normal-case px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              <TrendingUp className="h-3 w-3" />
              ML Forecasted
            </span>
          )}
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {destinations.map((dest) => (
          <button
            key={dest.id}
            onClick={() => {
              trackEvent({
                event_type: 'click',
                destination_id: dest.id,
                destination_slug: dest.slug,
                metadata: {
                  category: dest.category,
                  city: dest.city,
                  source: 'trending_section',
                },
              });
              router.push(`/destination/${dest.slug}`);
            }}
            className={`${CARD_WRAPPER} text-left`}
          >
            <div className={CARD_MEDIA}>
              {dest.image ? (
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
              )}
              {dest.ml_trending && dest.trend_percentage && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded shadow-lg">
                  🔥 +{Math.round(dest.trend_percentage)}%
                </span>
              )}
              {dest.is_open_now && !dest.ml_trending && (
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200 rounded">
                  OPEN NOW
                </span>
              )}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <span>⭐</span>
                  <span>{dest.michelin_stars}</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <div className={CARD_TITLE}>{dest.name}</div>
              <div className={CARD_META}>
                {dest.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {dest.city}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

