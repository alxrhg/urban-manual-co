/**
 * ML-powered Trending Section
 *
 * Shows trending destinations based on demand forecasting using Prophet.
 * Identifies destinations with increasing demand in the near future.
 */

'use client';

import { useMLTrending } from '@/hooks/useMLRecommendations';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin, TrendingUp, Flame } from 'lucide-react';
import { trackEvent } from '@/services/analytics/track';
import { useRouter } from 'next/navigation';

interface TrendingSectionMLProps {
  limit?: number;
  forecastDays?: number;
}

export function TrendingSectionML({
  limit = 12,
  forecastDays = 7
}: TrendingSectionMLProps) {
  const router = useRouter();
  const { trending, loading, error } = useMLTrending({
    enabled: true,
    topN: limit,
    forecastDays
  });

  if (loading) return null;
  if (error || !trending.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-gray-500 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Trending Now
          <span
            className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs"
            title="Powered by demand forecasting"
          >
            AI Forecast
          </span>
        </h2>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {trending.map((dest, index) => (
          <button
            key={dest.destination_id}
            onClick={() => {
              trackEvent({
                event_type: 'click',
                destination_id: dest.destination_id,
                destination_slug: dest.slug,
                metadata: {
                  category: dest.category,
                  city: dest.city,
                  source: 'ml_trending_section',
                  growth_rate: dest.growth_rate,
                  trend_rank: index + 1,
                },
              });
              router.push(`/destination/${dest.slug}`);
            }}
            className={`${CARD_WRAPPER} text-left group`}
            title={`${Math.round(dest.growth_rate * 100)}% growth predicted`}
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
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
              )}

              {/* Trending Badge */}
              <div className="absolute top-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                {index < 3 && '#' + (index + 1)}
              </div>

              {/* Growth Rate */}
              <div className="absolute bottom-2 right-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                +{Math.round(dest.growth_rate * 100)}%
              </div>
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
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Rising demand
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
