'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from './LovablyDestinationCard';
import { Sparkles } from 'lucide-react';
import { Destination } from '@/types/destination';

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

      // Determine context (weekend, evening, morning, etc.)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFriday = dayOfWeek === 5;
      const isNearWeekend = isFriday && hour >= 17; // Friday evening

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

      // Fetch recommendations based on context
      const response = await fetch(`/api/recommendations/smart?context=${contextType}&userId=${user?.id}`);
      const data = await response.json();

      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error loading smart recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
    if (!user) {
      setLoading(false);
      return;
    }

    // Only load when component is visible
    if (isVisible) {
      loadSmartRecommendations();
    }
  }, [user, isVisible, loadSmartRecommendations]);

  if (!user || loading) return null;
  if (!recommendations.length) return null;

  return (
    <section ref={sectionRef} className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-gray-400" />
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {context}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {recommendations.slice(0, 7).map((dest, index) => (
          <LovablyDestinationCard
            key={dest.id}
            destination={dest}
            borderColor={LOVABLY_BORDER_COLORS[index % LOVABLY_BORDER_COLORS.length]}
            onClick={() => {
              if (onCardClick) {
                onCardClick(dest);
              }
            }}
            showMLBadges={true}
          />
        ))}
      </div>
    </section>
  );
}

// Memoize component to prevent unnecessary re-renders
export const SmartRecommendations = memo(SmartRecommendationsComponent);
