// Common type definitions used across the application

import { Destination } from './destination';

// User type from Supabase Auth
export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
    bio?: string;
    [key: string]: unknown;
  };
  created_at?: string;
  [key: string]: unknown;
}

// Collection type
export interface Collection {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  public?: boolean; // Keep for backward compat
  is_public?: boolean; // Database field name
  created_at: string;
  updated_at?: string;
  destinations?: Destination[];
  destination_count?: number;
}

// Itinerary type
export interface Itinerary {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  days?: ItineraryDay[];
}

// Itinerary Day type
export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_number: number;
  date: string;
  notes?: string;
  items?: ItineraryItem[];
}

// Itinerary Item type
export interface ItineraryItem {
  id: string;
  itinerary_day_id: string;
  destination_slug: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  position: number;
  created_at: string;
  destination?: Destination;
}

// Visited Place type
export interface VisitedPlace {
  id: number;
  user_id: string;
  destination_id: number;
  destination_slug?: string; // Added for convenience
  visited_at?: string; // Changed from visited_date to match database
  rating?: number;
  notes?: string;
  created_at: string;
  destination?: Destination;
}

// Saved Place type
export interface SavedPlace {
  id: number;
  user_id: string;
  destination_id: number;
  destination_slug?: string; // Added for convenience
  created_at: string;
  destination?: Destination;
}

// Generic Supabase response type
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

// Search result type
export interface SearchResult extends Destination {
  similarity?: number;
  rank?: number;
}

// Database query result (for raw Supabase responses)
export type DbRecord = Record<string, unknown>;
export type DbArray = Array<Record<string, unknown>>;
