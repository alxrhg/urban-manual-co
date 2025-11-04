'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin, Sparkles } from 'lucide-react';
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
}

interface MLRecommendation {
  destination_id: number;
  score: number;
  reason: string;
}

export function ForYouSection() {
  const router = useRouter();
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingML, setUsingML] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Try ML recommendations first, fallback to existing API
    const fetchRecommendations = async () => {
      try {
        // Try ML service first
        const mlResponse = await fetch(`/api/ml/recommend/${user.id}?top_n=20`);

        if (mlResponse.ok && !mlResponse.headers.get('content-type')?.includes('fallback')) {
          const mlRecs: MLRecommendation[] = await mlResponse.json();

          if (mlRecs.length > 0) {
            // Fetch destination details for ML recommendations
            const destIds = mlRecs.map(r => r.destination_id).join(',');
            const detailsResponse = await fetch(`/api/destinations?ids=${destIds}`);

            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              // Sort by ML score
              const sortedDests = mlRecs.map(rec =>
                details.find((d: Destination) => d.id === rec.destination_id)
              ).filter(Boolean);

              setDestinations(sortedDests);
              setUsingML(true);
              setLoading(false);
              return;
            }
          }
        }
      } catch (error) {
        console.log('ML recommendations unavailable, falling back to rule-based');
      }

      // Fallback to existing personalization API
      try {
        const response = await fetch(`/api/personalization/${user.id}`);
        const data = await response.json();
        setDestinations(data.results || []);
        setUsingML(false);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user?.id]);

  if (!user || loading) return null;
  if (!destinations.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500 flex items-center gap-2">
          For You
          {usingML && (
            <span className="inline-flex items-center gap-1 text-xs normal-case px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              <Sparkles className="h-3 w-3" />
              ML-Powered
            </span>
          )}
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {destinations.slice(0, 6).map((dest) => (
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
                  source: 'for_you_section',
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

