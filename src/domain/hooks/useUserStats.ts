import { useMemo } from 'react';
import { cityCountryMap } from '@/data/cityCountryMap';
import type { SavedPlace, VisitedPlace } from '@/types/common';

export interface UserStats {
  uniqueCities: Set<string>;
  uniqueCountries: Set<string>;
  visitedCount: number;
  savedCount: number;
  collectionsCount: number;
  curationCompletionPercentage: number;
  visitedDestinationsWithCoords: Array<{
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

interface UseUserStatsParams {
  savedPlaces: SavedPlace[];
  visitedPlaces: VisitedPlace[];
  collectionsCount: number;
  totalDestinations: number;
}

/**
 * Custom hook to calculate user statistics from saved/visited places
 * Extracted from Account page for better testability and reusability
 */
export function useUserStats({
  savedPlaces,
  visitedPlaces,
  collectionsCount,
  totalDestinations,
}: UseUserStatsParams): UserStats {
  return useMemo((): UserStats => {
    // Calculate unique cities from saved and visited places
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter((city): city is string => typeof city === 'string'),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    // Get countries from destination.country field first, fallback to cityCountryMap
    const countriesFromDestinations = new Set([
      ...savedPlaces.map(p => p.destination?.country).filter((country): country is string => typeof country === 'string'),
      ...visitedPlaces.filter(p => p.destination?.country).map(p => p.destination!.country!)
    ]);
    
    // Also get countries from city mapping for destinations without country field
    // Normalize city names to match cityCountryMap format (lowercase, hyphenated)
    const countriesFromCities = Array.from(uniqueCities)
      .map(city => {
        if (!city) return null;
        // Try exact match first
        let country = cityCountryMap[city];
        if (country) return country;
        
        // Try lowercase match
        const cityLower = city.toLowerCase();
        country = cityCountryMap[cityLower];
        if (country) return country;
        
        // Try hyphenated version (e.g., "New York" -> "new-york")
        const cityHyphenated = cityLower.replace(/\s+/g, '-');
        country = cityCountryMap[cityHyphenated];
        if (country) return country;
        
        // Try without hyphens (e.g., "new-york" -> "newyork" - less common but possible)
        const cityNoHyphens = cityLower.replace(/-/g, '');
        country = cityCountryMap[cityNoHyphens];
        
        return country || null;
      })
      .filter((country): country is string => country !== null && country !== undefined);
    
    const uniqueCountries = new Set([
      ...Array.from(countriesFromDestinations),
      ...countriesFromCities
    ]);
    
    // Extract visited destinations with coordinates for map
    const visitedDestinationsWithCoords = visitedPlaces
      .filter(p => p.destination)
      .map(p => ({
        city: p.destination!.city,
        latitude: p.destination!.latitude,
        longitude: p.destination!.longitude,
      }))
      .filter(d => d.latitude && d.longitude);

    // Debug logging to help diagnose map issues (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[useUserStats] Countries found:', Array.from(uniqueCountries));
      console.log('[useUserStats] Countries from destinations:', Array.from(countriesFromDestinations));
      console.log('[useUserStats] Countries from cities:', countriesFromCities);
      console.log('[useUserStats] Unique cities:', Array.from(uniqueCities));
      console.log('[useUserStats] Visited places count:', visitedPlaces.length);
      console.log('[useUserStats] Visited destinations with coords:', visitedDestinationsWithCoords.length);
    }

    const curationCompletionPercentage = totalDestinations > 0
      ? Math.round((visitedPlaces.length / totalDestinations) * 100)
      : 0;

    return {
      uniqueCities,
      uniqueCountries,
      visitedCount: visitedPlaces.length,
      savedCount: savedPlaces.length,
      collectionsCount,
      curationCompletionPercentage,
      visitedDestinationsWithCoords
    };
  }, [savedPlaces, visitedPlaces, collectionsCount, totalDestinations]);
}

