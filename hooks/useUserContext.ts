'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Saved place from database with joined destination */
interface SavedPlaceRow {
  destination_slug: string;
  destinations: Array<{
    name?: string;
    city?: string;
    category?: string;
  }>;
}

/** Visited place from database with joined destination */
interface VisitedPlaceRow {
  destination_slug: string;
  rating: number | null;
  visited_at: string;
  destinations: Array<{
    name?: string;
    city?: string;
    category?: string;
  }>;
}

/** Trip from database */
interface TripRow {
  id: string;
  name: string;
  destinations: string[] | null;
  start_date: string | null;
  end_date: string | null;
}

/** Saved place in user context */
export interface UserSavedPlace {
  slug: string;
  name?: string;
  city?: string;
  category?: string;
}

/** Visited place in user context */
export interface UserVisitedPlace {
  slug: string;
  name?: string;
  city?: string;
  category?: string;
  rating?: number;
  visitedAt?: string;
}

/** Active trip in user context */
export interface UserActiveTrip {
  id: string;
  name: string;
  destinations: string[];
  startDate?: string;
  endDate?: string;
}

export interface UserContextData {
  // Profile
  displayName?: string;
  travelStyle?: string;
  favoriteCities?: string[];
  favoriteCategories?: string[];
  interests?: string[];

  // Saved & Visited
  savedPlaces: UserSavedPlace[];
  visitedPlaces: UserVisitedPlace[];

  // Active Trips
  activeTrips: UserActiveTrip[];

  // Stats
  stats: {
    savedCount: number;
    visitedCount: number;
    tripsCount: number;
  };
}

interface UseUserContextReturn {
  context: UserContextData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getContextSummary: () => string;
}

/**
 * Hook to fetch and provide user context for AI-powered features
 * Includes saved places, visited places with ratings, active trips, and preferences
 */
export function useUserContext(): UseUserContextReturn {
  const { user } = useAuth();
  const [context, setContext] = useState<UserContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContext = useCallback(async () => {
    if (!user?.id) {
      setContext(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Fetch all data in parallel
      const [
        profileResult,
        savedResult,
        visitedResult,
        tripsResult,
      ] = await Promise.all([
        // User profile
        supabase
          .from('user_profiles')
          .select('display_name, travel_style, favorite_cities, favorite_categories, interests')
          .eq('user_id', user.id)
          .maybeSingle(),

        // Saved places with destination details
        supabase
          .from('saved_places')
          .select(`
            destination_slug,
            destinations:destination_id (
              name,
              city,
              category
            )
          `)
          .eq('user_id', user.id)
          .order('saved_at', { ascending: false })
          .limit(50),

        // Visited places with ratings
        supabase
          .from('visited_places')
          .select(`
            destination_slug,
            rating,
            visited_at,
            destinations:destination_id (
              name,
              city,
              category
            )
          `)
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false })
          .limit(50),

        // Active trips
        supabase
          .from('trips')
          .select('id, name, destinations, start_date, end_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const profile = profileResult.data;
      const savedPlaces = (savedResult.data || []).map((item: SavedPlaceRow) => ({
        slug: item.destination_slug,
        name: item.destinations?.[0]?.name,
        city: item.destinations?.[0]?.city,
        category: item.destinations?.[0]?.category,
      }));

      const visitedPlaces = (visitedResult.data || []).map((item: VisitedPlaceRow) => ({
        slug: item.destination_slug,
        name: item.destinations?.[0]?.name,
        city: item.destinations?.[0]?.city,
        category: item.destinations?.[0]?.category,
        rating: item.rating ?? undefined,
        visitedAt: item.visited_at,
      }));

      const activeTrips = (tripsResult.data || []).map((trip: TripRow) => ({
        id: trip.id,
        name: trip.name,
        destinations: trip.destinations || [],
        startDate: trip.start_date ?? undefined,
        endDate: trip.end_date ?? undefined,
      }));

      setContext({
        displayName: profile?.display_name,
        travelStyle: profile?.travel_style,
        favoriteCities: profile?.favorite_cities,
        favoriteCategories: profile?.favorite_categories,
        interests: profile?.interests,
        savedPlaces,
        visitedPlaces,
        activeTrips,
        stats: {
          savedCount: savedPlaces.length,
          visitedCount: visitedPlaces.length,
          tripsCount: activeTrips.length,
        },
      });
    } catch (err) {
      console.error('Error fetching user context:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch context'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  /**
   * Generate a natural language summary of the user's context for AI
   */
  const getContextSummary = useCallback((): string => {
    if (!context) return '';

    const parts: string[] = [];

    // Name
    if (context.displayName) {
      parts.push(`User: ${context.displayName}`);
    }

    // Travel style
    if (context.travelStyle) {
      parts.push(`Travel style: ${context.travelStyle}`);
    }

    // Favorite cities
    if (context.favoriteCities?.length) {
      parts.push(`Favorite cities: ${context.favoriteCities.slice(0, 5).join(', ')}`);
    }

    // Favorite categories
    if (context.favoriteCategories?.length) {
      parts.push(`Prefers: ${context.favoriteCategories.join(', ')}`);
    }

    // Recently saved places
    if (context.savedPlaces.length > 0) {
      const recentSaved = context.savedPlaces.slice(0, 5);
      const savedSummary = recentSaved
        .filter(p => p.name)
        .map(p => `${p.name} (${p.city})`)
        .join(', ');
      if (savedSummary) {
        parts.push(`Recently saved: ${savedSummary}`);
      }
    }

    // Highly rated visited places
    const highlyRated = context.visitedPlaces
      .filter(p => p.rating && p.rating >= 4)
      .slice(0, 5);
    if (highlyRated.length > 0) {
      const ratedSummary = highlyRated
        .filter(p => p.name)
        .map(p => `${p.name} (${p.rating}/5)`)
        .join(', ');
      if (ratedSummary) {
        parts.push(`Highly rated visits: ${ratedSummary}`);
      }
    }

    // Active trips
    if (context.activeTrips.length > 0) {
      const upcomingTrips = context.activeTrips.filter(t => {
        if (!t.startDate) return false;
        return new Date(t.startDate) > new Date();
      });
      if (upcomingTrips.length > 0) {
        const tripNames = upcomingTrips.map(t => t.name).join(', ');
        parts.push(`Upcoming trips: ${tripNames}`);
      }
    }

    // Stats summary
    parts.push(`Activity: ${context.stats.savedCount} saved, ${context.stats.visitedCount} visited`);

    return parts.join('. ');
  }, [context]);

  return {
    context,
    isLoading,
    error,
    refresh: fetchContext,
    getContextSummary,
  };
}

/** Formatted user context for API */
export interface FormattedUserContext {
  travelStyle?: string;
  favoriteCities?: string[];
  favoriteCategories?: string[];
  savedSlugs: string[];
  highlyRatedVisits: Array<{ slug: string; rating: number | undefined }>;
  activeTrips: Array<{ name: string; destinations: string[] }>;
}

/**
 * Format user context for API requests
 */
export function formatUserContextForAPI(context: UserContextData | null): FormattedUserContext | Record<string, never> {
  if (!context) return {};

  return {
    travelStyle: context.travelStyle,
    favoriteCities: context.favoriteCities,
    favoriteCategories: context.favoriteCategories,
    savedSlugs: context.savedPlaces.slice(0, 20).map(p => p.slug),
    highlyRatedVisits: context.visitedPlaces
      .filter(p => p.rating && p.rating >= 4)
      .slice(0, 10)
      .map(p => ({ slug: p.slug, rating: p.rating })),
    activeTrips: context.activeTrips.map(t => ({
      name: t.name,
      destinations: t.destinations,
    })),
  };
}
