'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Grid3x3, List } from 'lucide-react';
import { NoSavedPlacesEmptyState, NoResultsEmptyState } from './EmptyStates';

interface SavedPlace {
  destination_slug: string;
  destination: {
    name: string;
    city: string;
    category: string;
    image: string;
  };
}

interface EnhancedSavedTabProps {
  savedPlaces: SavedPlace[];
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function EnhancedSavedTab({ savedPlaces }: EnhancedSavedTabProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  // Extract unique cities and categories
  const { cities, categories } = useMemo(() => {
    const citiesSet = new Set<string>();
    const categoriesSet = new Set<string>();

    savedPlaces.forEach(place => {
      if (place.destination.city) citiesSet.add(place.destination.city);
      if (place.destination.category) categoriesSet.add(place.destination.category);
    });

    return {
      cities: Array.from(citiesSet).sort(),
      categories: Array.from(categoriesSet).sort()
    };
  }, [savedPlaces]);

  // Filter and sort places
  const filteredPlaces = useMemo(() => {
    let filtered = [...savedPlaces];

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
      return 0; // Keep original order for 'recent'
    });

    return filtered;
  }, [savedPlaces, filterCity, filterCategory, sortBy]);

  if (savedPlaces.length === 0) {
    return <NoSavedPlacesEmptyState />;
  }

  return (
    <div className="space-y-12">
      {/* View Mode + Sort */}
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

      {/* City Filter */}
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

      {/* Category Filter */}
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

      {/* No results after filtering */}
      {filteredPlaces.length === 0 && (
        <NoResultsEmptyState />
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredPlaces.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
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
                  <Heart className="w-3 h-3 fill-current" />
                </div>
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

      {/* List View */}
      {viewMode === 'list' && filteredPlaces.length > 0 && (
        <div className="space-y-2">
          {filteredPlaces.map((place) => (
            <button
              key={place.destination_slug}
              onClick={() => router.push(`/destination/${place.destination_slug}`)}
              className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-left"
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
              </div>
              <div className="flex-shrink-0">
                <Heart className="w-4 h-4 fill-current text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
