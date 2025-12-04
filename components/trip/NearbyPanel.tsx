'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Clock, Coffee, Utensils, Building2, ShoppingBag, Loader2, X, ChevronDown } from 'lucide-react';
import { calculateDistanceKm, getCurrentTimeContext, getTimeBasedCategories } from '@/lib/contextual-suggestions';

interface Destination {
  id: number;
  slug: string;
  name: string;
  category?: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  image_thumbnail?: string;
  city?: string;
}

interface NearbyPanelProps {
  center: { lat: number; lng: number };
  city?: string;
  onSelectPlace?: (destination: Destination) => void;
  onClose?: () => void;
  className?: string;
}

type CategoryFilter = 'all' | 'cafe' | 'restaurant' | 'museum' | 'shopping' | 'bar';

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All nearby', icon: <MapPin className="w-4 h-4" /> },
  { value: 'cafe', label: 'Cafes', icon: <Coffee className="w-4 h-4" /> },
  { value: 'restaurant', label: 'Restaurants', icon: <Utensils className="w-4 h-4" /> },
  { value: 'museum', label: 'Museums', icon: <Building2 className="w-4 h-4" /> },
  { value: 'shopping', label: 'Shopping', icon: <ShoppingBag className="w-4 h-4" /> },
];

/**
 * Get icon for a category
 */
function getCategoryIcon(category?: string): React.ReactNode {
  if (!category) return <MapPin className="w-4 h-4" />;

  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes('cafe') || normalizedCategory.includes('coffee')) {
    return <Coffee className="w-4 h-4" />;
  }
  if (normalizedCategory.includes('restaurant') || normalizedCategory.includes('dining')) {
    return <Utensils className="w-4 h-4" />;
  }
  if (normalizedCategory.includes('museum') || normalizedCategory.includes('gallery')) {
    return <Building2 className="w-4 h-4" />;
  }
  if (normalizedCategory.includes('shop') || normalizedCategory.includes('store')) {
    return <ShoppingBag className="w-4 h-4" />;
  }

  return <MapPin className="w-4 h-4" />;
}

/**
 * NearbyPanel - Shows places near a location
 * Used with the map to display "What's nearby?" results
 */
export default function NearbyPanel({
  center,
  city,
  onSelectPlace,
  onClose,
  className = '',
}: NearbyPanelProps) {
  const [places, setPlaces] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [radiusKm, setRadiusKm] = useState(1);

  // Get time-based category recommendation
  const timeContext = getCurrentTimeContext();
  const recommendedCategories = getTimeBasedCategories(timeContext.currentHour);
  const suggestedCategory = recommendedCategories[0];

  // Fetch nearby places
  const fetchNearbyPlaces = useCallback(async () => {
    if (!city) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        city,
        limit: '20',
      });

      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }

      // Fetch from destinations API
      const response = await fetch(`/api/destinations?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch nearby places');
      }

      const data = await response.json();
      const destinations: Destination[] = data.destinations || data || [];

      // Filter by distance from center
      const nearbyPlaces = destinations
        .filter((dest: Destination) => {
          if (!dest.latitude || !dest.longitude) return false;
          const distance = calculateDistanceKm(
            center.lat,
            center.lng,
            dest.latitude,
            dest.longitude
          );
          return distance <= radiusKm;
        })
        .sort((a: Destination, b: Destination) => {
          // Sort by distance
          const distA = a.latitude && a.longitude
            ? calculateDistanceKm(center.lat, center.lng, a.latitude, a.longitude)
            : Infinity;
          const distB = b.latitude && b.longitude
            ? calculateDistanceKm(center.lat, center.lng, b.latitude, b.longitude)
            : Infinity;
          return distA - distB;
        })
        .slice(0, 10);

      setPlaces(nearbyPlaces);
    } catch (err) {
      console.error('Error fetching nearby places:', err);
      setError('Could not load nearby places');
    } finally {
      setIsLoading(false);
    }
  }, [city, center.lat, center.lng, categoryFilter, radiusKm]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900 dark:text-white text-sm">What's nearby?</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 space-y-3">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setCategoryFilter(option.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === option.value
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        {/* Open now toggle and radius */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowOpenNow(!showOpenNow)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showOpenNow
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Open now
          </button>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Within</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              <option value={0.5}>500m</option>
              <option value={1}>1 km</option>
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
            </select>
          </div>
        </div>

        {/* Time-based suggestion */}
        {suggestedCategory && categoryFilter === 'all' && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="text-amber-600 dark:text-amber-400 font-medium">Tip:</span> Perfect time for {suggestedCategory}!
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Finding nearby places...</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={fetchNearbyPlaces}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && places.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No places found within {radiusKm < 1 ? `${radiusKm * 1000}m` : `${radiusKm}km`}
            </p>
            <button
              onClick={() => setRadiusKm(prev => Math.min(prev * 2, 10))}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Expand search radius
            </button>
          </div>
        )}

        {!isLoading && places.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {places.map((place) => {
              const distance = place.latitude && place.longitude
                ? calculateDistanceKm(center.lat, center.lng, place.latitude, place.longitude)
                : null;

              return (
                <button
                  key={place.id}
                  onClick={() => onSelectPlace?.(place)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  {/* Image or icon */}
                  {place.image_thumbnail ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                      <img
                        src={place.image_thumbnail}
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {getCategoryIcon(place.category)}
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {place.name}
                      </span>
                      {place.rating && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                          <span>⭐</span>
                          {place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {place.category && (
                        <span className="capitalize">{place.category}</span>
                      )}
                      {distance !== null && (
                        <>
                          <span>·</span>
                          <span>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add indicator */}
                  <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {places.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Showing {places.length} places within {radiusKm < 1 ? `${radiusKm * 1000}m` : `${radiusKm}km`}
          </p>
        </div>
      )}
    </div>
  );
}
