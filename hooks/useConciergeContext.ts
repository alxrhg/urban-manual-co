'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrip } from '@/contexts/TripContext';
import type { Destination } from '@/types/destination';

export interface UpcomingTrip {
  id: string;
  name: string;
  destination: string;
  destinations: string[];
  startDate: string | null;
  daysUntil: number;
}

export interface UserPreferences {
  favoriteCities: string[];
  favoriteCategories: string[];
  preferOutdoor: boolean;
  preferQuiet: boolean;
  recentSearches: string[];
}

export interface ConciergeContext {
  // User state
  isAuthenticated: boolean;
  userName: string | null;

  // Trip awareness
  upcomingTrip: UpcomingTrip | null;
  hasUpcomingTrip: boolean;

  // User preferences (simplified for now)
  preferences: UserPreferences;

  // Time context
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  greeting: string;

  // Helper functions
  isDestinationInTrip: (destination: Destination) => boolean;
  matchesTripCity: (city: string) => boolean;
  getRelevantTripContext: (query: string) => string | null;
}

/**
 * Calculate days until a date
 */
function getDaysUntil(dateString: string | null): number {
  if (!dateString) return -1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get time of day based on current hour
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Get simple greeting based on time of day
 */
function getGreeting(timeOfDay: 'morning' | 'afternoon' | 'evening'): string {
  switch (timeOfDay) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
  }
}

/**
 * Parse destinations from trip destination field
 * Supports both single city and JSON array formats
 */
function parseDestinations(destination: string | null): string[] {
  if (!destination) return [];

  if (destination.startsWith('[')) {
    try {
      const parsed = JSON.parse(destination);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // Fall through to legacy format
    }
  }

  return destination.trim() ? [destination.trim()] : [];
}

/**
 * useConciergeContext - Provides trip and preference awareness for concierge messaging
 *
 * This hook centralizes all the context needed for intelligent concierge messages:
 * - Upcoming trip detection and days until
 * - User preferences and patterns
 * - Time-based greetings
 * - Helper functions for matching context to search/destinations
 */
export function useConciergeContext(): ConciergeContext {
  const { user } = useAuth();
  const { trips } = useTrip();

  const timeOfDay = getTimeOfDay();
  const greeting = getGreeting(timeOfDay);

  // Find the nearest upcoming trip
  const upcomingTrip = useMemo((): UpcomingTrip | null => {
    if (!trips || trips.length === 0) return null;

    // Find trips with start dates in the future
    const upcomingTrips = trips
      .map(trip => {
        // Need to fetch full trip data with dates from the database
        // For now, work with what's available in TripContext
        return {
          id: trip.id,
          name: trip.name,
          destination: trip.destination,
          destinations: parseDestinations(trip.destination),
          startDate: null as string | null, // Would come from full trip data
          daysUntil: -1,
        };
      })
      .filter(trip => trip.destinations.length > 0);

    // Return the first trip for now (ideally would be sorted by start date)
    return upcomingTrips[0] || null;
  }, [trips]);

  // Simplified preferences (could be expanded with user_preferences table)
  const preferences = useMemo((): UserPreferences => {
    return {
      favoriteCities: [],
      favoriteCategories: [],
      preferOutdoor: false,
      preferQuiet: false,
      recentSearches: [],
    };
  }, []);

  // Check if a destination is in the current trip
  const isDestinationInTrip = useMemo(() => {
    return (destination: Destination): boolean => {
      if (!upcomingTrip) return false;

      const tripCities = upcomingTrip.destinations.map(d => d.toLowerCase());
      const destCity = destination.city?.toLowerCase() || '';

      return tripCities.some(city => destCity.includes(city) || city.includes(destCity));
    };
  }, [upcomingTrip]);

  // Check if a city matches trip destination
  const matchesTripCity = useMemo(() => {
    return (city: string): boolean => {
      if (!upcomingTrip) return false;

      const tripCities = upcomingTrip.destinations.map(d => d.toLowerCase());
      const searchCity = city.toLowerCase();

      return tripCities.some(c => searchCity.includes(c) || c.includes(searchCity));
    };
  }, [upcomingTrip]);

  // Get relevant trip context for a search query
  const getRelevantTripContext = useMemo(() => {
    return (query: string): string | null => {
      if (!upcomingTrip || upcomingTrip.daysUntil < 0) return null;

      const queryLower = query.toLowerCase();
      const isRelevant = upcomingTrip.destinations.some(
        dest => queryLower.includes(dest.toLowerCase())
      );

      if (isRelevant && upcomingTrip.daysUntil >= 0) {
        const timeText = upcomingTrip.daysUntil === 0
          ? 'today'
          : upcomingTrip.daysUntil === 1
            ? 'tomorrow'
            : `in ${upcomingTrip.daysUntil} days`;

        return `You're heading to ${upcomingTrip.destinations[0]} ${timeText}.`;
      }

      return null;
    };
  }, [upcomingTrip]);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || null;

  return {
    isAuthenticated: !!user,
    userName,
    upcomingTrip,
    hasUpcomingTrip: upcomingTrip !== null && upcomingTrip.daysUntil >= 0,
    preferences,
    timeOfDay,
    greeting,
    isDestinationInTrip,
    matchesTripCity,
    getRelevantTripContext,
  };
}

/**
 * Enhanced hook that fetches full trip data including dates
 */
export function useConciergeContextWithDates(): ConciergeContext & { isLoading: boolean } {
  const baseContext = useConciergeContext();

  // In a full implementation, this would fetch trip dates from Supabase
  // For now, return the base context with loading state

  return {
    ...baseContext,
    isLoading: false,
  };
}
