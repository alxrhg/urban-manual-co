'use client';

import { useRecommendations } from '@/hooks/useRecommendations';
import { Destination } from '@/types/destination';
import { Sparkles } from 'lucide-react';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from './LovablyDestinationCard';
import { useMemo, memo } from 'react';

interface PersonalizedRecommendationsProps {
  limit?: number;
  title?: string;
  showTitle?: boolean;
  onDestinationClick?: (destination: Destination) => void;
  className?: string;
  filterCity?: string; // Filter recommendations by city slug
}

function PersonalizedRecommendationsComponent({
  limit = 12,
  title = 'For You',
  showTitle = true,
  onDestinationClick,
  className = '',
  filterCity,
}: PersonalizedRecommendationsProps) {
  const { recommendations, loading, error } = useRecommendations({
    limit: filterCity ? limit * 2 : limit, // Fetch more if filtering to ensure we have enough
    enabled: true, // Only fetch if user is authenticated (handled by API)
    filterCity,
  });

  // Don't show anything if not authenticated or no recommendations
  if (error || (!loading && recommendations.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <div className={className}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="group relative transition-all duration-300">
              <div className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse border-4 border-gray-300 dark:border-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const destinations = useMemo(() => {
    let filtered = recommendations
      .map((rec) => rec.destination)
      .filter((d): d is Destination => !!d);

    // Additional client-side city filtering (as backup)
    if (filterCity) {
      filtered = filtered.filter(d =>
        d.city?.toLowerCase() === filterCity.toLowerCase()
      );
    }

    return filtered;
  }, [recommendations, filterCity]);

  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
        {destinations.map((destination, index) => {
          const rec = recommendations.find((r) => r.destinationId === destination.id);
          return (
            <div key={destination.slug} className="relative group">
              <LovablyDestinationCard
                destination={destination}
                borderColor={LOVABLY_BORDER_COLORS[index % LOVABLY_BORDER_COLORS.length]}
                onClick={() => {
                  if (onDestinationClick) {
                    onDestinationClick(destination);
                  }
                }}
                showMLBadges={true}
              />

              {/* AI Match Badge - Overlay */}
              {rec && rec.score > 0.7 && (
                <div className="absolute top-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-20 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  <span>Match</span>
                </div>
              )}

              {/* AI Reason (tooltip on hover) - Overlay */}
              {rec && rec.reason && (
                <div className="absolute inset-0 bg-black/80 dark:bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 z-30 pointer-events-none">
                  <p className="text-white text-xs text-center font-medium">{rec.reason}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const PersonalizedRecommendations = memo(PersonalizedRecommendationsComponent);

