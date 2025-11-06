'use client';

import { useEffect, useState } from 'react';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from '@/components/LovablyDestinationCard';
import { trackEvent } from '@/lib/analytics/track';

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
  match_score?: number;
  label?: string;
}

export function RelatedDestinations({ destinationId }: { destinationId: string }) {
  const [similar, setSimilar] = useState<Destination[]>([]);
  const [complementary, setComplementary] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/similar/${destinationId}`)
      .then(res => res.json())
      .then(data => {
        setSimilar(data.similar || []);
        setComplementary(data.complementary || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [destinationId]);

  if (loading || (!similar.length && !complementary.length)) return null;

  return (
    <div className="space-y-12 mt-12">
      {similar.length > 0 && (
        <section>
          <h3 className="text-sm tracking-wide uppercase text-neutral-500 mb-4">
            Similar Vibe
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {similar.map((dest, index) => (
              <LovablyDestinationCard
                key={dest.id}
                destination={dest}
                borderColor={LOVABLY_BORDER_COLORS[index % LOVABLY_BORDER_COLORS.length]}
                onClick={() => {
                  trackEvent({
                    event_type: 'click',
                    destination_id: dest.id,
                    destination_slug: dest.slug,
                    metadata: {
                      category: dest.category,
                      city: dest.city,
                      source: 'related_similar_vibe',
                      relation_type: 'similar',
                      match_score: dest.match_score,
                    },
                  });
                  window.location.href = `/destination/${dest.slug}`;
                }}
                showMLBadges={true}
              />
            ))}
          </div>
        </section>
      )}

      {complementary.length > 0 && (
        <section>
          <h3 className="text-sm tracking-wide uppercase text-neutral-500 mb-4">
            Pair With
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {complementary.map((dest, index) => (
              <LovablyDestinationCard
                key={dest.id}
                destination={dest}
                borderColor={LOVABLY_BORDER_COLORS[index % LOVABLY_BORDER_COLORS.length]}
                onClick={() => {
                  trackEvent({
                    event_type: 'click',
                    destination_id: dest.id,
                    destination_slug: dest.slug,
                    metadata: {
                      category: dest.category,
                      city: dest.city,
                      source: 'related_pair_with',
                      relation_type: 'complementary',
                      match_score: dest.match_score,
                    },
                  });
                  window.location.href = `/destination/${dest.slug}`;
                }}
                showMLBadges={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

