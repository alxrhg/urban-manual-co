'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from './LovablyDestinationCard';
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
}

function TrendingSectionComponent({ city }: { city?: string }) {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const fetchTrending = useCallback(() => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    params.set('limit', '6');

    fetch(`/api/trending?${params}`)
      .then(res => res.json())
      .then(data => {
        setDestinations(data.trending || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [city]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before coming into view
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only fetch when visible
    if (isVisible) {
      fetchTrending();
    }
  }, [isVisible, fetchTrending]);

  if (loading) return null;
  if (!destinations.length) return null;

  return (
    <section ref={sectionRef} className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-neutral-500">
          Trending This Week
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {destinations.map((dest, index) => (
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
                  source: 'trending_section',
                },
              });
              router.push(`/destination/${dest.slug}`);
            }}
            showMLBadges={true}
          />
        ))}
      </div>
    </section>
  );
}

// Memoize component to prevent unnecessary re-renders
export const TrendingSection = memo(TrendingSectionComponent);

