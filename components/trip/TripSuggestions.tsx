'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Sparkles, Plus, MapPin, Loader2, RefreshCw, ChevronRight, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Destination } from '@/types/destination';

interface TripSuggestionsProps {
  destinations: string[]; // Trip destination cities
  existingSlugs: string[]; // Already in itinerary - exclude these
  onAddToTrip: (destination: Destination) => void;
  selectedDayNumber: number;
  className?: string;
}

interface SuggestionDestination extends Destination {
  reason?: string;
}

/**
 * TripSuggestions - Horizontal scrollable row of AI-powered suggestions
 * Shows destinations that complement what's already in the trip
 */
export default function TripSuggestions({
  destinations,
  existingSlugs,
  onAddToTrip,
  selectedDayNumber,
  className = '',
}: TripSuggestionsProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!user || destinations.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      // Get destinations in the trip's cities that aren't already in the itinerary
      const { data: cityDestinations, error } = await supabase
        .from('destinations')
        .select('slug, name, city, category, neighborhood, description, micro_description, image, image_thumbnail, latitude, longitude, rating, michelin_stars, crown, tags')
        .in('city', destinations.map(d => d.toLowerCase()))
        .not('slug', 'in', `(${existingSlugs.length > 0 ? existingSlugs.map(s => `"${s}"`).join(',') : '""'})`)
        .limit(20);

      if (error) throw error;

      if (!cityDestinations || cityDestinations.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Try to get personalized recommendations from the API
      try {
        const response = await fetch('/api/intelligence/trip-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cities: destinations,
            existingSlugs,
            limit: 8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.suggestions?.length > 0) {
            setSuggestions(data.suggestions);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall back to basic suggestions
      }

      // Fallback: Score destinations by rating and variety
      const scored = cityDestinations
        .map(dest => ({
          ...dest,
          score: (dest.rating || 0) * 2 +
                 (dest.michelin_stars || 0) * 5 +
                 (dest.crown ? 3 : 0) +
                 Math.random() * 2, // Some randomness for variety
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setSuggestions(scored as SuggestionDestination[]);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [user, destinations, existingSlugs]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleAdd = useCallback(async (destination: Destination) => {
    setAdding(destination.slug);
    try {
      await onAddToTrip(destination);
      // Remove from suggestions after adding
      setSuggestions(prev => prev.filter(s => s.slug !== destination.slug));
    } finally {
      setAdding(null);
    }
  }, [onAddToTrip]);

  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Suggestions for Day {selectedDayNumber}
          </h3>
          {!loading && suggestions.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({suggestions.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && !loading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchSuggestions();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Refresh suggestions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-36">
                  <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800 rounded-xl mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No more suggestions for {destinations.join(', ')}
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {suggestions.map(dest => (
                <div
                  key={dest.slug}
                  className="group flex-shrink-0 w-36 relative"
                >
                  {/* Card */}
                  <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-700">
                    {dest.image || dest.image_thumbnail ? (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {dest.michelin_stars && dest.michelin_stars > 0 && (
                        <div className="px-1.5 py-0.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded text-[10px] font-medium flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          {dest.michelin_stars}
                        </div>
                      )}
                      {dest.crown && (
                        <div className="px-1.5 py-0.5 bg-amber-100/90 dark:bg-amber-900/50 backdrop-blur-sm rounded text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          Crown
                        </div>
                      )}
                    </div>

                    {/* Add button - appears on hover */}
                    <button
                      onClick={() => handleAdd(dest)}
                      disabled={adding === dest.slug}
                      className="absolute bottom-2 right-2 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                      title={`Add to Day ${selectedDayNumber}`}
                    >
                      {adding === dest.slug ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Info */}
                  <h4 className="font-medium text-xs text-gray-900 dark:text-white line-clamp-1 mb-0.5">
                    {dest.name}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{dest.category?.replace(/_/g, ' ')}</span>
                    {dest.rating && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {dest.rating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                  {dest.neighborhood && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {dest.neighborhood}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
