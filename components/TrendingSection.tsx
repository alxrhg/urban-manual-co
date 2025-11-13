'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';
import { useRouter } from 'next/navigation';
import { Section, SectionHeader, SectionRail } from '@/components/design-system/Section';
import { ResultsGrid } from '@/components/design-system/ResultsGrid';
import { DestinationCardV2, MediaBadge } from '@/components/design-system/DestinationCardV2';
import { DestinationCardSkeleton } from '@/components/skeletons/DestinationCardSkeleton';

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

  const fetchTrending = useCallback(async () => {
    try {
      const discoveryResponse = await fetch('/api/search/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'trending popular destinations',
          filters: city ? { city } : {},
          pageSize: 6,
        }),
      });

      if (discoveryResponse.ok) {
        const discoveryData = await discoveryResponse.json();
        if (discoveryData.results && discoveryData.results.length > 0) {
          const transformed = discoveryData.results.map((result: any) => ({
            id: result.id || parseInt(result.slug) || 0,
            slug: result.slug || result.id,
            name: result.name,
            city: result.city,
            category: result.category,
            image: result.images?.[0] || result.image,
            rating: result.rating || 0,
            price_level: result.priceLevel || result.price_level || 0,
            michelin_stars: result.michelin_stars || 0,
            is_open_now: result.is_open_now,
          }));
          setDestinations(transformed);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn('Discovery Engine trending failed, falling back:', error);
    }

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

  const handleCardClick = useCallback(
    async (dest: Destination, index: number) => {
      trackEvent({
        event_type: 'click',
        destination_id: dest.id,
        destination_slug: dest.slug,
        metadata: {
          category: dest.category,
          city: dest.city,
          source: 'trending_section',
          position: index,
        },
      });

      try {
        const response = await fetch('/api/discovery/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'click',
            documentId: dest.slug,
            source: 'trending_section',
          }),
        });
        if (!response.ok) {
          console.warn('Failed to track Discovery Engine event');
        }
      } catch (error) {
        console.warn('Discovery Engine tracking error:', error);
      }

      router.push(`/destination/${dest.slug}`);
    },
    [router]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: '100px' }
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
    if (isVisible) {
      fetchTrending();
    }
  }, [isVisible, fetchTrending]);

  if (!isVisible && loading) {
    return <section ref={sectionRef} aria-hidden />;
  }

  if (!destinations.length && !loading) {
    return null;
  }

  return (
    <Section ref={sectionRef} aria-label="Trending destinations">
      <SectionHeader eyebrow="Trending This Week" />
      <SectionRail>
        <ResultsGrid
          items={destinations}
          isLoading={loading}
          skeletonCount={6}
          renderSkeleton={(index) => <DestinationCardSkeleton key={index} />}
          keyExtractor={(dest) => dest.slug}
          renderItem={(dest, index) => (
            <DestinationCardV2
              destination={dest}
              index={index}
              onSelect={() => handleCardClick(dest, index)}
              mediaBadges={{
                topRight: dest.is_open_now ? <MediaBadge>OPEN NOW</MediaBadge> : undefined,
                bottomLeft:
                  dest.michelin_stars && dest.michelin_stars > 0 ? (
                    <MediaBadge>
                      <Image
                        src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                        alt="Michelin star"
                        width={12}
                        height={12}
                      />
                      <span>{dest.michelin_stars}</span>
                    </MediaBadge>
                  ) : undefined,
              }}
              metaPrimary={
                dest.city ? (
                  <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                    <MapPin className="h-3 w-3" />
                    {dest.city}
                  </span>
                ) : null
              }
            />
          )}
        />
      </SectionRail>
    </Section>
  );
}

export const TrendingSection = memo(TrendingSectionComponent);
