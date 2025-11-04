'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, Grid3x3, List, Star } from 'lucide-react';

interface VisitedPlace {
  destination_slug: string;
  visited_at: string;
  rating?: number;
  notes?: string;
  destination: {
    name: string;
    city: string;
    category: string;
    image: string;
  };
}

interface EnhancedVisitedTabProps {
  visitedPlaces: VisitedPlace[];
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function EnhancedVisitedTab({ visitedPlaces }: EnhancedVisitedTabProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  // Extract unique cities and categories
  const { cities, categories } = useMemo(() => {
    const citiesSet = new Set<string>();
    const categoriesSet = new Set<string>();

    visitedPlaces.forEach(place => {
      if (place.destination.city) citiesSet.add(place.destination.city);
      if (place.destination.category) categoriesSet.add(place.destination.category);
    });

    return {
      cities: Array.from(citiesSet).sort(),
      categories: Array.from(categoriesSet).sort()
    };
  }, [visitedPlaces]);

  // Filter and sort places
  const filteredPlaces = useMemo(() => {
    let filtered = [...visitedPlaces];

    if (filterCity) {
      filtered = filtered.filter(p => p.destination.city === filterCity);
    }
    if (filterCategory) {
      filtered = filtered.filter(p => p.destination.category === filterCategory);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.destination.name.localeCompare(b.destination.name);
      }
      return new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime();
    });

    return filtered;
  }, [visitedPlaces, filterCity, filterCategory, sortBy]);

  if (visitedPlaces.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📍</div>
        <p className="text-sm text-gray-500">No visited places yet</p>
        <p className="text-xs text-gray-400 mt-2">Mark places you've been to</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* View Mode + Sort - Minimal inline controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`transition-all ${
              viewMode === 'grid'
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`transition-all ${
              viewMode === 'list'
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            List
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setSortBy('recent')}
            className={`transition-all ${
              sortBy === 'recent'
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`transition-all ${
              sortBy === 'name'
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* City Filter - Matches homepage style exactly */}
      {cities.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <button
            onClick={() => setFilterCity('')}
            className={`transition-all ${
              !filterCity
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            All Cities
          </button>
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setFilterCity(city === filterCity ? '' : city)}
              className={`transition-all ${
                filterCity === city
                  ? 'font-medium text-black dark:text-white'
                  : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
              }`}
            >
              {capitalizeCity(city)}
            </button>
          ))}
        </div>
      )}

      {/* Category Filter - Matches homepage style exactly */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <button
            onClick={() => setFilterCategory('')}
            className={`transition-all ${
              !filterCategory
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            All Categories
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setFilterCategory(category === filterCategory ? '' : category)}
              className={`transition-all capitalize ${
                filterCategory === category
                  ? 'font-medium text-black dark:text-white'
                  : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlaces.map((place) => (
            <button
              key={place.destination_slug}
              onClick={() => router.push(`/destination/${place.destination_slug}`)}
              className="group relative text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 mb-2">
                {place.destination.image && (
                  <Image
                    src={place.destination.image}
                    alt={place.destination.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                )}
                <div className="absolute top-2 right-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                {place.rating && (
                  <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                    ⭐ {place.rating}
                  </div>
                )}
              </div>
              <h3 className="font-medium text-sm leading-tight line-clamp-2">
                {place.destination.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {capitalizeCity(place.destination.city)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* List View - Minimal */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredPlaces.map((place) => (
            <button
              key={place.destination_slug}
              onClick={() => router.push(`/destination/${place.destination_slug}`)}
              className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-2xl transition-colors text-left"
            >
              {place.destination.image && (
                <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={place.destination.image}
                    alt={place.destination.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{place.destination.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {capitalizeCity(place.destination.city)} • {place.destination.category}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(place.visited_at).toLocaleDateString()}
                  {place.rating && ` • ⭐ ${place.rating}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
