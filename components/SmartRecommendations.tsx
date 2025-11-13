'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Sparkles } from 'lucide-react';
import { Destination } from '@/types/destination';
import { Section, SectionHeader, SectionRail } from '@/components/design-system/Section';
import { ResultsGrid } from '@/components/design-system/ResultsGrid';
import { DestinationCardV2 } from '@/components/design-system/DestinationCardV2';
import { DestinationCardSkeleton } from '@/components/skeletons/DestinationCardSkeleton';

interface SmartRecommendationsProps {
  onCardClick?: (destination: Destination) => void;
}

function SmartRecommendationsComponent({ onCardClick }: SmartRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const loadSmartRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFriday = dayOfWeek === 5;
      const isNearWeekend = isFriday && hour >= 17;

      let contextType = 'personalized';
      let contextLabel = 'For You';

      if (isWeekend) {
        contextType = 'weekend';
        contextLabel = 'Weekend Picks';
      } else if (isNearWeekend) {
        contextType = 'weekend';
        contextLabel = 'Weekend is Near';
      } else if (hour >= 17 && hour <= 22) {
        contextType = 'evening';
        contextLabel = 'Tonight';
      } else if (hour >= 6 && hour <= 11) {
        contextType = 'morning';
        contextLabel = 'Morning Favorites';
      }

      setContext(contextLabel);

      try {
        const contextResponse = await fetch('/api/discovery/recommendations/contextual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            context: {
              time: now.toISOString(),
              weather: null,
              city: null,
              category: contextType === 'evening' ? 'dining' : contextType === 'morning' ? 'cafe' : null,
            },
            pageSize: 12,
          }),
        });

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          if (contextData.recommendations && contextData.recommendations.length > 0) {
            const transformed = contextData.recommendations.map((rec: any) => ({
              id: rec.id || rec.slug,
              slug: rec.slug || rec.id,
              name: rec.name,
              description: rec.description,
              city: rec.city,
              category: rec.category,
              rating: rec.rating || 0,
              price_level: rec.priceLevel || rec.price_level || 0,
              image: rec.images?.[0] || null,
            }));
            setRecommendations(transformed);
            return;
          }
        }
      } catch (error) {
        console.warn('Contextual recommendations failed, falling back:', error);
      }

      const response = await fetch(`/api/recommendations/smart?context=${contextType}&userId=${user?.id}`);
      const data = await response.json();

      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error loading smart recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
    if (!user) {
      setLoading(false);
      return;
    }

    if (isVisible) {
      loadSmartRecommendations();
    }
  }, [user, isVisible, loadSmartRecommendations]);

  if (!user) {
    return null;
  }

  if (!isVisible && loading) {
    return <section ref={sectionRef} aria-hidden />;
  }

  if (!recommendations.length && !loading) {
    return null;
  }

  const displayedRecommendations = recommendations.slice(0, 7);

  return (
    <Section ref={sectionRef} aria-label="Smart recommendations">
      <SectionHeader eyebrow={context} icon={<Sparkles className="h-4 w-4 text-gray-400" />} />
      <SectionRail>
        <ResultsGrid
          items={displayedRecommendations}
          isLoading={loading}
          skeletonCount={7}
          renderSkeleton={(index) => <DestinationCardSkeleton key={index} />}
          keyExtractor={(dest) => dest.slug}
          renderItem={(dest, index) => (
            <DestinationCardV2
              destination={dest}
              index={index}
              onSelect={() => onCardClick?.(dest)}
              showIntelligenceBadges={false}
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

export const SmartRecommendations = memo(SmartRecommendationsComponent);
