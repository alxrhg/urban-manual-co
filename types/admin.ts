import type { Destination } from './destination';
import type { AdminAnalyticsStats, UserInteractionMetadata } from './analytics';

export interface DestinationFormValues {
  slug: string;
  name: string;
  city: string;
  category: string;
  description: string;
  content: string;
  image: string;
  michelin_stars: number | null;
  crown: boolean;
  parent_destination_id: number | null;
}

export type DestinationPayload = DestinationFormValues &
  Partial<Pick<Destination, 'google_place_id' | 'formatted_address' | 'rating'>>;

export interface ParentDestinationSummary {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
}

export interface DestinationSearchResult {
  slug: string;
  name: string;
  city: string;
}

export interface GooglePlaceSuggestion {
  name?: string;
  city?: string;
  category?: string;
  description?: string;
  content?: string;
  image?: string;
}

export interface SearchLogEntry {
  id: string;
  created_at: string;
  interaction_type: 'search';
  user_id: string | null;
  metadata: UserInteractionMetadata | null;
}

export interface UserInteractionRow {
  interaction_type: string;
  created_at: string;
  user_id: string | null;
  metadata: UserInteractionMetadata | null;
}

export interface RegenerationResult {
  updated: number;
  skipped: number;
  errors?: string[];
  details?: string;
}

export type AdminAnalyticsState = AdminAnalyticsStats;
