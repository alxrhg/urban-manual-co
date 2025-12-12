/**
 * Rating-Based Recommendation Service
 *
 * Improves recommendations by learning from user's visit ratings.
 * Analyzes patterns in highly-rated places to find similar destinations.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { Destination } from '@/types/destination';

/** Visit record with joined destination data */
interface VisitWithDestination {
  rating: number | null;
  destination_slug: string;
  destinations: {
    id: number;
    category: string;
    city: string;
    price_level: number | null;
    tags: string[] | null;
    name?: string;
    slug?: string;
  } | null;
}

/** Saved/visited place slug record */
interface PlaceSlugRecord {
  destination_slug: string;
}

/** Candidate destination from database */
interface CandidateDestination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  rating: number | null;
  price_level: number | null;
  image: string | null;
  micro_description: string | null;
  tags: string[] | null;
}

export interface UserRatingProfile {
  userId: string;
  preferredCategories: Array<{ category: string; avgRating: number; count: number }>;
  preferredCities: Array<{ city: string; avgRating: number; count: number }>;
  preferredPriceLevel: number | null;
  preferredAttributes: string[];
  totalRatings: number;
  avgOverallRating: number;
}

export interface RatedDestination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  rating: number;
  userRating: number;
  priceLevel?: number;
  tags?: string[];
}

export interface RecommendationResult {
  destination: {
    id: number;
    slug: string;
    name: string;
    city: string;
    category: string;
    rating: number;
    priceLevel?: number;
    image?: string;
    microDescription?: string;
  };
  score: number;
  reasons: string[];
}

/**
 * Build a user's rating profile from their visited places
 */
export async function buildUserRatingProfile(userId: string): Promise<UserRatingProfile | null> {
  const supabase = await createServerClient();

  // Fetch user's visited places with ratings
  const { data: visits, error } = await supabase
    .from('visited_places')
    .select(`
      rating,
      destination_slug,
      destinations:destination_id (
        id,
        category,
        city,
        price_level,
        tags
      )
    `)
    .eq('user_id', userId)
    .not('rating', 'is', null);

  if (error || !visits || visits.length === 0) {
    return null;
  }

  // Analyze category preferences
  const categoryStats: Record<string, { totalRating: number; count: number }> = {};
  const cityStats: Record<string, { totalRating: number; count: number }> = {};
  const priceLevels: number[] = [];
  const attributeCounts: Record<string, number> = {};
  let totalRating = 0;

  visits.forEach((visit: VisitWithDestination) => {
    const rating = visit.rating || 0;
    const dest = visit.destinations;

    if (!dest) return;

    totalRating += rating;

    // Category analysis
    const category = dest.category || 'unknown';
    if (!categoryStats[category]) {
      categoryStats[category] = { totalRating: 0, count: 0 };
    }
    categoryStats[category].totalRating += rating;
    categoryStats[category].count += 1;

    // City analysis
    const city = dest.city || 'unknown';
    if (!cityStats[city]) {
      cityStats[city] = { totalRating: 0, count: 0 };
    }
    cityStats[city].totalRating += rating;
    cityStats[city].count += 1;

    // Price level (only for highly rated)
    if (rating >= 4 && dest.price_level) {
      priceLevels.push(dest.price_level);
    }

    // Tag/attribute analysis (for highly rated places)
    if (rating >= 4 && dest.tags) {
      dest.tags.forEach((tag: string) => {
        attributeCounts[tag] = (attributeCounts[tag] || 0) + 1;
      });
    }
  });

  // Calculate preferred categories
  const preferredCategories = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      avgRating: stats.totalRating / stats.count,
      count: stats.count,
    }))
    .filter(c => c.count >= 2 && c.avgRating >= 3.5)
    .sort((a, b) => b.avgRating - a.avgRating);

  // Calculate preferred cities
  const preferredCities = Object.entries(cityStats)
    .map(([city, stats]) => ({
      city,
      avgRating: stats.totalRating / stats.count,
      count: stats.count,
    }))
    .filter(c => c.avgRating >= 4)
    .sort((a, b) => b.avgRating - a.avgRating);

  // Calculate preferred price level
  const preferredPriceLevel = priceLevels.length >= 3
    ? Math.round(priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length)
    : null;

  // Get top attributes
  const preferredAttributes = Object.entries(attributeCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([attr]) => attr);

  return {
    userId,
    preferredCategories,
    preferredCities,
    preferredPriceLevel,
    preferredAttributes,
    totalRatings: visits.length,
    avgOverallRating: totalRating / visits.length,
  };
}

/**
 * Get personalized recommendations based on user's rating profile
 */
export async function getPersonalizedRecommendations(
  userId: string,
  options: {
    city?: string;
    category?: string;
    limit?: number;
    excludeSlugs?: string[];
  } = {}
): Promise<RecommendationResult[]> {
  const { city, category, limit = 20, excludeSlugs = [] } = options;

  const supabase = await createServerClient();

  // Build user profile
  const profile = await buildUserRatingProfile(userId);

  // Get user's visited and saved places to exclude
  const [visitedResult, savedResult] = await Promise.all([
    supabase
      .from('visited_places')
      .select('destination_slug')
      .eq('user_id', userId),
    supabase
      .from('saved_places')
      .select('destination_slug')
      .eq('user_id', userId),
  ]);

  const visitedSlugs = (visitedResult.data || []).map((v: PlaceSlugRecord) => v.destination_slug);
  const savedSlugs = (savedResult.data || []).map((s: PlaceSlugRecord) => s.destination_slug);
  const allExcluded = new Set([...visitedSlugs, ...savedSlugs, ...excludeSlugs]);

  // Build query for candidates
  let query = supabase
    .from('destinations')
    .select('id, slug, name, city, category, rating, price_level, image, micro_description, tags')
    .order('rating', { ascending: false })
    .limit(200);

  if (city) {
    query = query.ilike('city', city.toLowerCase().replace(/\s+/g, '-'));
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates) {
    console.error('Error fetching recommendation candidates:', error);
    return [];
  }

  // Score and rank candidates
  const scoredCandidates = candidates
    .filter((c: CandidateDestination) => !allExcluded.has(c.slug))
    .map((candidate: CandidateDestination) => {
      let score = 0;
      const reasons: string[] = [];

      // Base score from destination rating
      score += (candidate.rating || 0) * 10;

      if (profile) {
        // Boost for preferred categories
        const categoryPref = profile.preferredCategories.find(
          p => p.category === candidate.category
        );
        if (categoryPref) {
          const categoryBoost = categoryPref.avgRating * 5;
          score += categoryBoost;
          reasons.push(`You enjoy ${candidate.category}s`);
        }

        // Boost for preferred cities
        const cityPref = profile.preferredCities.find(
          p => p.city === candidate.city
        );
        if (cityPref) {
          const cityBoost = cityPref.avgRating * 3;
          score += cityBoost;
          reasons.push(`You liked places in ${formatCity(candidate.city)}`);
        }

        // Boost for matching price level
        if (profile.preferredPriceLevel && candidate.price_level) {
          const priceDiff = Math.abs(profile.preferredPriceLevel - candidate.price_level);
          if (priceDiff === 0) {
            score += 10;
            reasons.push('Matches your price preference');
          } else if (priceDiff === 1) {
            score += 5;
          }
        }

        // Boost for matching attributes/tags
        if (candidate.tags && profile.preferredAttributes.length > 0) {
          const matchingTags = candidate.tags.filter((t: string) =>
            profile.preferredAttributes.includes(t)
          );
          if (matchingTags.length > 0) {
            score += matchingTags.length * 3;
            if (matchingTags.length >= 2) {
              reasons.push(`Similar to places you\'ve enjoyed`);
            }
          }
        }
      }

      // Add generic reason if no specific matches
      if (reasons.length === 0 && candidate.rating !== null && candidate.rating >= 4.5) {
        reasons.push('Highly rated destination');
      }

      return {
        destination: {
          id: candidate.id,
          slug: candidate.slug,
          name: candidate.name,
          city: candidate.city,
          category: candidate.category,
          rating: candidate.rating ?? undefined,
          priceLevel: candidate.price_level ?? undefined,
          image: candidate.image ?? undefined,
          microDescription: candidate.micro_description ?? undefined,
        },
        score,
        reasons,
      };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, limit);

  return scoredCandidates;
}

/**
 * Get "Because you liked X" recommendations
 */
export async function getSimilarToLiked(
  userId: string,
  options: {
    limit?: number;
  } = {}
): Promise<{ basedOn: string; recommendations: RecommendationResult[] }[]> {
  const { limit = 5 } = options;

  const supabase = await createServerClient();

  // Get user's highest rated visits
  const { data: topRated, error } = await supabase
    .from('visited_places')
    .select(`
      rating,
      destination_slug,
      destinations:destination_id (
        id,
        name,
        slug,
        city,
        category,
        tags
      )
    `)
    .eq('user_id', userId)
    .gte('rating', 4)
    .order('rating', { ascending: false })
    .limit(3);

  if (error || !topRated || topRated.length === 0) {
    return [];
  }

  const results: { basedOn: string; recommendations: RecommendationResult[] }[] = [];

  for (const visit of topRated) {
    const dest = (visit as VisitWithDestination).destinations;
    if (!dest) continue;

    // Find similar destinations
    let query = supabase
      .from('destinations')
      .select('id, slug, name, city, category, rating, price_level, image, micro_description')
      .eq('category', dest.category)
      .neq('slug', dest.slug)
      .order('rating', { ascending: false })
      .limit(limit);

    // Prefer same city
    const { data: sameCityResults } = await query.eq('city', dest.city);
    const { data: otherCityResults } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, rating, price_level, image, micro_description')
      .eq('category', dest.category)
      .neq('slug', dest.slug)
      .neq('city', dest.city)
      .order('rating', { ascending: false })
      .limit(limit);

    const combined = [
      ...(sameCityResults || []),
      ...(otherCityResults || []),
    ].slice(0, limit);

    if (combined.length > 0) {
      results.push({
        basedOn: dest.name || '',
        recommendations: combined.map((c: CandidateDestination) => ({
          destination: {
            id: c.id,
            slug: c.slug,
            name: c.name,
            city: c.city,
            category: c.category,
            rating: c.rating ?? undefined,
            priceLevel: c.price_level ?? undefined,
            image: c.image ?? undefined,
            microDescription: c.micro_description ?? undefined,
          },
          score: (c.rating ?? 0) * 10,
          reasons: [`Similar to ${dest.name}`],
        })),
      });
    }
  }

  return results;
}

// Helper function
function formatCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
