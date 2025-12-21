'use client';

import { memo, useMemo } from 'react';
import Image from 'next/image';
import { Star, Crown, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { Destination } from '@/types/destination';

interface Collection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  destinations: Destination[];
  color: string;
}

interface CuratedCollectionsProps {
  destinations: Destination[];
  onCollectionClick?: (collectionId: string, destinations: Destination[]) => void;
  onDestinationClick?: (destination: Destination) => void;
  className?: string;
}

export const CuratedCollections = memo(function CuratedCollections({
  destinations,
  onCollectionClick,
  onDestinationClick,
  className = '',
}: CuratedCollectionsProps) {
  // Build collections from destinations
  const collections = useMemo(() => {
    const result: Collection[] = [];

    // Michelin Stars collection
    const michelinDestinations = destinations.filter(
      (d) => d.michelin_stars && d.michelin_stars > 0
    );
    if (michelinDestinations.length > 0) {
      result.push({
        id: 'michelin',
        title: 'Michelin Stars',
        description: `${michelinDestinations.length} starred destinations`,
        icon: <img src="/michelin-star.svg" alt="Michelin" className="w-5 h-5" />,
        destinations: michelinDestinations,
        color: 'from-red-500/10 to-red-600/5',
      });
    }

    // Urban Manual Picks (Crown)
    const crownDestinations = destinations.filter((d) => d.crown);
    if (crownDestinations.length > 0) {
      result.push({
        id: 'crown',
        title: "Editor's Picks",
        description: `${crownDestinations.length} curated favorites`,
        icon: <span className="text-xl">👑</span>,
        destinations: crownDestinations,
        color: 'from-amber-500/10 to-amber-600/5',
      });
    }

    // Top Rated (4.5+)
    const topRatedDestinations = destinations.filter(
      (d) => d.rating && d.rating >= 4.5
    );
    if (topRatedDestinations.length >= 3) {
      result.push({
        id: 'top-rated',
        title: 'Top Rated',
        description: `${topRatedDestinations.length} highly rated places`,
        icon: <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />,
        destinations: topRatedDestinations.slice(0, 20),
        color: 'from-yellow-500/10 to-yellow-600/5',
      });
    }

    // Most Saved (Popular)
    const popularDestinations = destinations
      .filter((d) => d.saves_count && d.saves_count > 0)
      .sort((a, b) => (b.saves_count || 0) - (a.saves_count || 0))
      .slice(0, 20);
    if (popularDestinations.length >= 3) {
      result.push({
        id: 'popular',
        title: 'Most Popular',
        description: `${popularDestinations.length} trending spots`,
        icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
        destinations: popularDestinations,
        color: 'from-blue-500/10 to-blue-600/5',
      });
    }

    return result;
  }, [destinations]);

  if (collections.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Curated Collections
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {collections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => onCollectionClick?.(collection.id, collection.destinations)}
            className={`
              group relative overflow-hidden
              p-4 rounded-2xl
              bg-gradient-to-br ${collection.color}
              border border-gray-200 dark:border-gray-800
              text-left
              transition-all duration-300
              hover:shadow-lg hover:scale-[1.02]
              hover:border-gray-300 dark:hover:border-gray-700
            `}
          >
            {/* Background Images - Subtle collage */}
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
              <div className="grid grid-cols-2 gap-0.5 h-full">
                {collection.destinations.slice(0, 4).map((dest, i) => (
                  <div key={dest.slug} className="relative overflow-hidden">
                    {(dest.image_thumbnail || dest.image) && (
                      <Image
                        src={dest.image_thumbnail || dest.image!}
                        alt=""
                        fill
                        sizes="100px"
                        className="object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                {collection.icon}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {collection.title}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {collection.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                <span>Explore</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
