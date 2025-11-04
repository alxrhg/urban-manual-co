/**
 * User Embedding Service
 *
 * Generates and manages user embeddings based on their behavior, preferences,
 * and interaction history for AI-powered personalization.
 */

import { embedText } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { TravelIntelligenceConfig } from './config';

export interface UserProfile {
  savedPlaces: Array<{
    id: string;
    name: string;
    city: string;
    category: string;
    description?: string;
    tags?: string[];
  }>;
  visitedPlaces: Array<{
    id: string;
    name: string;
    city: string;
    category: string;
  }>;
  preferences: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    travelStyle?: string;
    dietaryRestrictions?: string[];
    interests?: string[];
  };
  searchHistory?: Array<{
    query: string;
    timestamp: Date;
  }>;
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a comprehensive text representation of user preferences
 */
export function buildUserProfileText(profile: UserProfile): string {
  const parts: string[] = [];

  // User preferences
  if (profile.preferences.favoriteCities && profile.preferences.favoriteCities.length > 0) {
    parts.push(`Favorite cities: ${profile.preferences.favoriteCities.join(', ')}`);
  }

  if (profile.preferences.favoriteCategories && profile.preferences.favoriteCategories.length > 0) {
    parts.push(`Favorite categories: ${profile.preferences.favoriteCategories.join(', ')}`);
  }

  if (profile.preferences.travelStyle) {
    parts.push(`Travel style: ${profile.preferences.travelStyle}`);
  }

  if (profile.preferences.interests && profile.preferences.interests.length > 0) {
    parts.push(`Interests: ${profile.preferences.interests.join(', ')}`);
  }

  // Saved places (recent weighted more)
  const config = TravelIntelligenceConfig.personalization.userEmbedding;
  const recentSaved = profile.savedPlaces.slice(0, 10);
  if (recentSaved.length > 0) {
    const savedDescriptions = recentSaved.map(place => {
      const tagStr = place.tags ? ` (${place.tags.join(', ')})` : '';
      return `${place.name} in ${place.city} - ${place.category}${tagStr}`;
    });
    parts.push(`Saved places: ${savedDescriptions.join('; ')}`);
  }

  // Visited places (recent history)
  const recentVisited = profile.visitedPlaces.slice(0, 10);
  if (recentVisited.length > 0) {
    const visitedDescriptions = recentVisited.map(place =>
      `${place.name} in ${place.city} - ${place.category}`
    );
    parts.push(`Visited: ${visitedDescriptions.join('; ')}`);
  }

  // Recent searches
  const recentSearches = profile.searchHistory?.slice(0, 5);
  if (recentSearches && recentSearches.length > 0) {
    const searches = recentSearches.map(s => s.query);
    parts.push(`Recent searches: ${searches.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Generate or retrieve cached user embedding
 */
export async function getUserEmbedding(
  userId: string,
  profile: UserProfile
): Promise<number[] | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  try {
    // Check for cached embedding
    const { data: cached, error: cacheError } = await supabase
      .from('user_embeddings')
      .select('embedding, updated_at, interaction_count')
      .eq('user_id', userId)
      .single();

    const config = TravelIntelligenceConfig.personalization.userEmbedding;

    // Use cached if exists and recent enough
    if (cached && !cacheError) {
      const hoursSinceUpdate =
        (Date.now() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60);

      // Refresh if stale or significant new interactions
      const shouldRefresh =
        hoursSinceUpdate > 24 ||
        (profile.savedPlaces.length + profile.visitedPlaces.length) - cached.interaction_count >
          config.refreshAfterInteractions;

      if (!shouldRefresh && cached.embedding) {
        return cached.embedding;
      }
    }

    // Generate new embedding
    const profileText = buildUserProfileText(profile);
    if (!profileText) return null;

    const embedding = await embedText(profileText);
    if (!embedding) return null;

    // Store in database
    const interactionCount = profile.savedPlaces.length + profile.visitedPlaces.length;

    await supabase.from('user_embeddings').upsert(
      {
        user_id: userId,
        embedding: embedding as any,
        interaction_count: interactionCount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    return embedding;
  } catch (error) {
    console.error('[getUserEmbedding] Error:', error);
    return null;
  }
}

/**
 * Compute personalized scores for destinations using user embedding
 */
export async function computePersonalizedScores(
  userId: string,
  profile: UserProfile,
  destinations: Array<{
    id: string;
    vector_embedding?: number[];
    [key: string]: any;
  }>
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  try {
    // Get user embedding
    const userEmbedding = await getUserEmbedding(userId, profile);
    if (!userEmbedding) {
      console.warn('[computePersonalizedScores] No user embedding available');
      return scores;
    }

    // Compute cosine similarity for each destination
    for (const dest of destinations) {
      if (!dest.vector_embedding || !Array.isArray(dest.vector_embedding)) {
        continue;
      }

      const similarity = cosineSimilarity(userEmbedding, dest.vector_embedding);

      // Normalize to 0-1 (cosine similarity is -1 to 1, but usually 0-1 for similar text)
      const normalizedScore = Math.max(0, Math.min(1, similarity));
      scores.set(dest.id, normalizedScore);
    }

    return scores;
  } catch (error) {
    console.error('[computePersonalizedScores] Error:', error);
    return scores;
  }
}

/**
 * Fetch comprehensive user profile for AI personalization
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  try {
    // Fetch in parallel
    const [savedResult, visitedResult, profileResult, searchResult] = await Promise.all([
      // Saved places with full details
      supabase
        .from('saved_places')
        .select(
          `
          destination_slug,
          destination:destinations!inner (
            id,
            name,
            city,
            category,
            description,
            tags
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Visited places
      supabase
        .from('visit_history')
        .select(
          `
          destination_id,
          destination:destinations!inner (
            id,
            name,
            city,
            category
          )
        `
        )
        .eq('user_id', userId)
        .order('visited_at', { ascending: false })
        .limit(20),

      // User preferences
      supabase
        .from('user_profiles')
        .select('favorite_cities, favorite_categories, travel_style, dietary_restrictions, interests')
        .eq('user_id', userId)
        .single(),

      // Recent searches
      supabase
        .from('user_interactions')
        .select('metadata, created_at')
        .eq('user_id', userId)
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Build profile
    const profile: UserProfile = {
      savedPlaces: [],
      visitedPlaces: [],
      preferences: {},
      searchHistory: [],
    };

    // Process saved places
    if (savedResult.data) {
      profile.savedPlaces = savedResult.data
        .map((item: any) => {
          const dest = item.destination;
          if (!dest || typeof dest !== 'object') return null;
          return {
            id: dest.id,
            name: dest.name,
            city: dest.city,
            category: dest.category,
            description: dest.description,
            tags: dest.tags || [],
          };
        })
        .filter(Boolean);
    }

    // Process visited places
    if (visitedResult.data) {
      profile.visitedPlaces = visitedResult.data
        .map((item: any) => {
          const dest = item.destination;
          if (!dest || typeof dest !== 'object') return null;
          return {
            id: dest.id,
            name: dest.name,
            city: dest.city,
            category: dest.category,
          };
        })
        .filter(Boolean);
    }

    // Process preferences
    if (profileResult.data) {
      profile.preferences = {
        favoriteCities: profileResult.data.favorite_cities || [],
        favoriteCategories: profileResult.data.favorite_categories || [],
        travelStyle: profileResult.data.travel_style,
        dietaryRestrictions: profileResult.data.dietary_restrictions || [],
        interests: profileResult.data.interests || [],
      };
    }

    // Process search history
    if (searchResult.data) {
      profile.searchHistory = searchResult.data
        .map((item: any) => {
          if (!item.metadata?.query) return null;
          return {
            query: item.metadata.query,
            timestamp: new Date(item.created_at),
          };
        })
        .filter(Boolean);
    }

    return profile;
  } catch (error) {
    console.error('[fetchUserProfile] Error:', error);
    return null;
  }
}
