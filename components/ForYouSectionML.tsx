/**
 * Enhanced ForYouSection with ML-powered recommendations
 *
 * This component uses the ML microservice for collaborative filtering recommendations
 * with automatic fallback to the existing recommendation system.
 *
 * To enable ML recommendations:
 * 1. Set ML_SERVICE_URL in .env
 * 2. Train the ML models
 * 3. Use this component instead of ForYouSection
 */

'use client';

import { useMLRecommendations } from '@/hooks/useMLRecommendations';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin, Sparkles } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { useRouter } from 'next/navigation';

export function ForYouSectionML() {
  const router = useRouter();
  const {
    recommendations,
    loading,
    error,
    isMLPowered,
    isFallback
  } = useMLRecommendations({
    enabled: true,
    topN: 6,
    excludeVisited: true,
    excludeSaved: true,
    fallbackToExisting: true
  });

  if (loading) return null;
  if (!recommendations.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500 flex items-center gap-2">
          For You
          {isMLPowered && (
            <span
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 dark:border-dark-blue-600 rounded-2xl text-gray-600 dark:text-gray-400 text-xs"
              title="Powered by machine learning"
            >
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          )}
          {isFallback && (
            <span
              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-200 dark:border-dark-blue-600 rounded-2xl text-gray-600 dark:text-gray-400 text-xs"
              title="Using standard recommendations"
            >
              Standard
            </span>
          )}
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {recommendations.map((rec, index) => (
          <button
            key={rec.destination_id}
            onClick={() => {
              trackEvent({
                event_type: 'click',
                destination_id: rec.destination_id,
                destination_slug: rec.slug,
                metadata: {
                  category: rec.category,
                  city: rec.city,
                  source: isMLPowered ? 'ml_for_you_section' : 'for_you_section',
                  ml_score: rec.score,
                  ml_powered: isMLPowered,
                },
              });
              router.push(`/destination/${rec.slug}`);
            }}
            className={`${CARD_WRAPPER} text-left group`}
            title={rec.reason}
          >
            <div className={`${CARD_MEDIA} mb-3`}>
              {/* Image would be fetched from destination data */}
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                <MapPin className="h-8 w-8 opacity-20" />
              </div>

              {/* ML Score Badge (for high-confidence recommendations) */}
              {isMLPowered && rec.score > 0.8 && (
                <div className="absolute top-2 right-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {Math.round(rec.score * 100)}%
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className={CARD_TITLE}>{rec.name}</div>
              <div className={CARD_META}>
                <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {rec.city}
                </span>
                {rec.category && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                      {rec.category}
                    </span>
                  </>
                )}
              </div>
              {isMLPowered && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
                  {rec.reason}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Using standard recommendations (ML service unavailable)
        </div>
      )}
    </section>
  );
}
