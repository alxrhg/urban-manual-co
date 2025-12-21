'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { MapPin, History, Sparkles, ArrowRight } from 'lucide-react';
import { useHomepageData } from './HomepageDataProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * Personalized Section - Shows browsing history and recommendations
 *
 * Features:
 * - Recently viewed destinations (from localStorage)
 * - "You might like" based on viewing patterns
 * - For logged-in users: saved/visited destinations influence recommendations
 */

interface DestinationCardProps {
  destination: Destination;
  onSelect: (destination: Destination) => void;
  showReason?: string;
}

function DestinationCard({ destination, onSelect, showReason }: DestinationCardProps) {
  const imageUrl = destination.image_thumbnail || destination.image;

  return (
    <button
      onClick={() => onSelect(destination)}
      className="group flex-shrink-0 w-[180px] sm:w-[200px] text-left"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800/50 mb-2.5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            sizes="200px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            quality={85}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <MapPin className="h-6 w-6 opacity-30" />
          </div>
        )}

        {/* Reason badge */}
        {showReason && (
          <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg text-[10px] font-medium
                         bg-black/60 backdrop-blur-sm text-white/90 line-clamp-1">
            {showReason}
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-[13px] font-medium text-gray-900 dark:text-white line-clamp-1 mb-0.5">
        {destination.name}
      </h3>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
        {capitalizeCity(destination.city)}
      </p>
    </button>
  );
}

// Local storage key for recently viewed - matches useRecentlyViewed hook
const RECENTLY_VIEWED_KEY = 'recentlyViewed';

interface RecentlyViewedItem {
  slug: string;
  name: string;
  city: string;
  image: string;
  category: string;
  michelin_stars?: number;
  viewedAt: number;
}

// Get recently viewed from localStorage
function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!stored) return [];
    const items: RecentlyViewedItem[] = JSON.parse(stored);
    return items.map(item => item.slug);
  } catch {
    return [];
  }
}

export function PersonalizedSection() {
  const { destinations, openDestination, isLoading } = useHomepageData();
  const { user } = useAuth();
  const [recentlyViewedSlugs, setRecentlyViewedSlugs] = useState<string[]>([]);

  // Load recently viewed on mount
  useEffect(() => {
    setRecentlyViewedSlugs(getRecentlyViewed());
  }, []);

  // Get recently viewed destinations
  const recentlyViewed = useMemo(() => {
    if (!destinations.length || !recentlyViewedSlugs.length) return [];

    return recentlyViewedSlugs
      .map(slug => destinations.find(d => d.slug === slug))
      .filter((d): d is Destination => d !== undefined)
      .slice(0, 6);
  }, [destinations, recentlyViewedSlugs]);

  // Generate recommendations based on viewing patterns
  const recommendations = useMemo(() => {
    if (!destinations.length) return [];
    if (recentlyViewed.length === 0) {
      // No history - show a random selection of highly rated destinations
      return destinations
        .filter(d => d.rating && d.rating >= 4.0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);
    }

    // Analyze viewing patterns
    const viewedCities = new Set(recentlyViewed.map(d => d.city?.toLowerCase()));
    const viewedCategories = new Set(recentlyViewed.map(d => d.category?.toLowerCase()));
    const viewedSlugs = new Set(recentlyViewed.map(d => d.slug));

    // Score destinations based on similarity to viewing history
    const scored = destinations
      .filter(d => !viewedSlugs.has(d.slug))
      .map(d => {
        let score = 0;

        // Same city as viewed
        if (d.city && viewedCities.has(d.city.toLowerCase())) {
          score += 3;
        }

        // Same category as viewed
        if (d.category && viewedCategories.has(d.category.toLowerCase())) {
          score += 2;
        }

        // Boost for highly rated
        if (d.rating && d.rating >= 4.5) {
          score += 1;
        }

        // Boost for Michelin starred
        if (d.michelin_stars && d.michelin_stars > 0) {
          score += 1;
        }

        return { destination: d, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored.map(item => ({
      ...item.destination,
      _reason: getReasonText(item.destination, viewedCities, viewedCategories),
    }));
  }, [destinations, recentlyViewed]);

  // Don't show if loading or no content
  if (isLoading) {
    return null;
  }

  // No recently viewed and no recommendations
  if (recentlyViewed.length === 0 && recommendations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4 px-4 sm:px-6 md:px-10">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
                Recently Viewed
              </h2>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(RECENTLY_VIEWED_KEY);
                setRecentlyViewedSlugs([]);
              }}
              className="text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 md:px-10 pb-2 -mb-2">
              {recentlyViewed.map(destination => (
                <DestinationCard
                  key={destination.slug}
                  destination={destination}
                  onSelect={openDestination}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 px-4 sm:px-6 md:px-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
                You Might Like
              </h2>
            </div>
            <button className="flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <span>More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 md:px-10 pb-2 -mb-2">
              {recommendations.map(destination => (
                <DestinationCard
                  key={destination.slug}
                  destination={destination}
                  onSelect={openDestination}
                  showReason={(destination as any)._reason}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function getReasonText(
  destination: Destination,
  viewedCities: Set<string>,
  viewedCategories: Set<string>
): string | undefined {
  const matchesCity = destination.city && viewedCities.has(destination.city.toLowerCase());
  const matchesCategory = destination.category && viewedCategories.has(destination.category.toLowerCase());

  if (matchesCity && matchesCategory) {
    return `More ${destination.category} in ${capitalizeCity(destination.city)}`;
  }
  if (matchesCity) {
    return `Also in ${capitalizeCity(destination.city)}`;
  }
  if (matchesCategory) {
    return `More ${capitalizeCategory(destination.category)}`;
  }
  return undefined;
}

export default PersonalizedSection;
