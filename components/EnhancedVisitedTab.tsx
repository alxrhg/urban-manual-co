'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, Grid3x3, List, Star, Map, Search, Download, X } from 'lucide-react';
import { NoVisitedPlacesEmptyState, NoResultsEmptyState } from './EmptyStates';
import { AddPlaceDropdown } from './AddPlaceDropdown';
import type { VisitedPlace } from '@/types/common';

interface EnhancedVisitedTabProps {
  visitedPlaces: VisitedPlace[];
  onPlaceAdded?: () => void;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function EnhancedVisitedTab({ visitedPlaces, onPlaceAdded }: EnhancedVisitedTabProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);

  // Extract unique cities, categories, and stats
  const { cities, categories, categoryStats, cityStats } = useMemo(() => {
    const citiesSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const categoryCount: Record<string, number> = {};
    const cityCount: Record<string, number> = {};

    visitedPlaces.forEach(place => {
      if (place.destination?.city) {
        citiesSet.add(place.destination.city);
        cityCount[place.destination.city] = (cityCount[place.destination.city] || 0) + 1;
      }
      if (place.destination?.category) {
        categoriesSet.add(place.destination.category);
        categoryCount[place.destination.category] = (categoryCount[place.destination.category] || 0) + 1;
      }
    });

    return {
      cities: Array.from(citiesSet).sort(),
      categories: Array.from(categoriesSet).sort(),
      categoryStats: Object.entries(categoryCount).sort(([, a], [, b]) => b - a),
      cityStats: Object.entries(cityCount).sort(([, a], [, b]) => b - a).slice(0, 5),
    };
  }, [visitedPlaces]);

  // Filter and sort places
  const filteredPlaces = useMemo(() => {
    let filtered = [...visitedPlaces];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.destination?.name?.toLowerCase().includes(query) ||
        p.destination?.city?.toLowerCase().includes(query) ||
        p.destination?.category?.toLowerCase().includes(query)
      );
    }

    if (filterCity) {
      filtered = filtered.filter(p => p.destination?.city === filterCity);
    }
    if (filterCategory) {
      filtered = filtered.filter(p => p.destination?.category === filterCategory);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.destination?.name || '').localeCompare(b.destination?.name || '');
      }
      return new Date(b.visited_at || 0).getTime() - new Date(a.visited_at || 0).getTime();
    });

    return filtered;
  }, [visitedPlaces, filterCity, filterCategory, sortBy, searchQuery]);

  // Places with coordinates for map view
  const placesWithCoords = useMemo(() => {
    return filteredPlaces.filter(p =>
      p.destination?.latitude && p.destination?.longitude
    );
  }, [filteredPlaces]);

  // Export function
  const handleExport = () => {
    const exportData = visitedPlaces.map(p => ({
      name: p.destination?.name,
      city: p.destination?.city,
      category: p.destination?.category,
      visited_at: p.visited_at,
      rating: p.rating,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visited-places.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (visitedPlaces.length === 0) {
    return <NoVisitedPlacesEmptyState />;
  }

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          <span className="font-medium text-black dark:text-white">{visitedPlaces.length}</span> places visited
        </span>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <span className="text-gray-600 dark:text-gray-400">
          <span className="font-medium text-black dark:text-white">{cities.length}</span> cities
        </span>
        {categoryStats.length > 0 && (
          <>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="flex flex-wrap gap-2">
              {categoryStats.slice(0, 4).map(([category, count]) => (
                <span key={category} className="text-xs text-gray-500 capitalize">
                  {category}: {count}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View Mode + Search + Export + Add */}
      <div className="flex items-center justify-between gap-4">
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
          <button
            onClick={() => setViewMode('map')}
            className={`transition-all flex items-center gap-1 ${
              viewMode === 'map'
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            <Map className="w-3 h-3" />
            Map
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 transition-colors ${
              showSearch ? 'text-black dark:text-white' : 'text-gray-400 hover:text-black dark:hover:text-white'
            }`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          <AddPlaceDropdown onPlaceAdded={onPlaceAdded} />
        </div>
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search places, cities, or categories..."
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-sm focus:outline-none focus:border-black dark:focus:border-white"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-400">Sort:</span>
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
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 mb-2">
                {place.destination?.image && (
                  <Image
                    src={place.destination.image}
                    alt={place.destination.name || ''}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                )}
                <div className="absolute top-2 right-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                {place.rating && (
                  <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                    <img src="/google-logo.svg" alt="Google" className="h-3 w-3" />
                    {place.rating}
                  </div>
                )}
              </div>
              <h3 className="font-medium text-sm leading-tight line-clamp-2">
                {place.destination?.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {place.destination?.city && capitalizeCity(place.destination.city)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* List View - Minimal */}
      {viewMode === 'list' && filteredPlaces.length > 0 && (
        <div className="space-y-2">
          {filteredPlaces.map((place) => (
            <button
              key={place.destination_slug}
              onClick={() => router.push(`/destination/${place.destination_slug}`)}
              className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
            >
              {place.destination?.image && (
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={place.destination.image}
                    alt={place.destination.name || ''}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{place.destination?.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {place.destination?.city && capitalizeCity(place.destination.city)} • {place.destination?.category}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {place.visited_at && new Date(place.visited_at).toLocaleDateString()}
                  {place.rating && <span className="inline-flex items-center gap-1 ml-1"> • <img src="/google-logo.svg" alt="Google" className="h-3 w-3 inline" /> {place.rating}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && filteredPlaces.length > 0 && (
        <div className="space-y-4">
          {placesWithCoords.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <Map className="w-8 h-8 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">No location data available for these places</p>
              <p className="text-xs text-gray-400 mt-1">Try switching to Grid or List view</p>
            </div>
          ) : (
            <>
              <div className="aspect-video rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {placesWithCoords.length} places with location data
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Map view coming soon</p>
                  </div>
                </div>
              </div>
              {/* List of places with coords */}
              <div className="space-y-2">
                {placesWithCoords.slice(0, 10).map((place) => (
                  <button
                    key={place.destination_slug}
                    onClick={() => router.push(`/destination/${place.destination_slug}`)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                    <span className="text-sm font-medium">{place.destination?.name}</span>
                    <span className="text-xs text-gray-500">
                      {place.destination?.city && capitalizeCity(place.destination.city)}
                    </span>
                  </button>
                ))}
                {placesWithCoords.length > 10 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    and {placesWithCoords.length - 10} more places
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
