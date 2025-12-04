'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from './CardStyles';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { trackEvent } from '@/services/analytics/track';
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

  const fetchTrending = useCallback(async () => {
    try {
      // Try Discovery Engine first for trending/popular destinations
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
          // Transform Discovery Engine results to Destination format
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

    // Fallback to classic trending API
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
    <section ref={sectionRef}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-gray-500">
          Trending This Week
        </h2>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {destinations.map((dest) => (
          <button
            key={dest.id}
            onClick={async () => {
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
              
              // Track click event to Discovery Engine for personalization
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
              {dest.is_open_now && (
                <span className="absolute top-2 right-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  OPEN NOW
                </span>
              )}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
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

// Memoize component to prevent unnecessary re-renders
export const TrendingSection = memo(TrendingSectionComponent);

