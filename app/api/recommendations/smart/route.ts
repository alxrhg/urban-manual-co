import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, handleSupabaseError } from '@/lib/errors';
import { getRedisClient } from '@/lib/cache/redis';
import { getRecommendationCache, setRecommendationCache } from '@/lib/cache/recommendation-cache';
import {
  scorePersonalizedDestinations,
  type DestinationWithFeatures,
  type UserPreferenceProfile,
} from '@/lib/recommendations/personalized';

const CACHE_TTL_SECONDS = Math.max(Number(process.env.RECOMMENDATION_CACHE_TTL ?? '180'), 60);
const CACHE_STALE_SECONDS = Math.max(Number(process.env.RECOMMENDATION_CACHE_STALE ?? '240'), 60);
const PERSONALIZED_LIMIT = 20;
const CANDIDATE_LIMIT = 120;
const TRENDING_LIMIT = 20;

const CONTEXT_CATEGORY_FILTERS: Record<string, string[]> = {
  weekend: ['cafe', 'restaurant', 'hotel', 'bar', 'activity'],
  evening: ['bar', 'restaurant', 'nightlife'],
  morning: ['cafe', 'bakery', 'breakfast'],
};

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

type RecommendationPayload = DestinationWithFeatures[];

export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const context = searchParams.get('context') || 'personalized';
  const userId = searchParams.get('userId');

  const supabase = await createServerClient();
  const categoryFilter = CONTEXT_CATEGORY_FILTERS[context] ?? [];

  const redis = getRedisClient();
  const cacheKey = userId ? `recommendations:${userId}:${context}` : null;
  const cacheOptions = { ttlSeconds: CACHE_TTL_SECONDS, staleSeconds: CACHE_STALE_SECONDS };

  const computeRecommendations = async (): Promise<RecommendationPayload> => {
    let profile: UserPreferenceProfile | null = null;

    if (userId) {
      profile = await fetchUserPreferences(supabase, userId);
      if (profile) {
        const embedding = await resolvePreferenceEmbedding(
          supabase,
          userId,
          (profile as any)?.preference_embedding
        );
        profile = {
          ...profile,
          preference_embedding: embedding,
        };
      }
    }

    const shouldPersonalize = context === 'personalized' && !!profile;

    if (shouldPersonalize && profile) {
      const candidates = await fetchDestinationCandidates(supabase, categoryFilter, CANDIDATE_LIMIT);
      const scored = scorePersonalizedDestinations(candidates, profile, {
        context,
        limit: PERSONALIZED_LIMIT,
      });

      if (scored.length > 0) {
        return scored;
      }
    }

    return fetchTrendingDestinations(supabase, categoryFilter, TRENDING_LIMIT);
  };

  if (cacheKey && redis) {
    const cached = await getRecommendationCache(redis, cacheKey, cacheOptions);

    if (cached && !cached.isStale) {
      const response = NextResponse.json({
        recommendations: cached.recommendations,
        context,
        cache: { hit: true, age: cached.age, stale: false },
      });
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      return response;
    }

    if (cached && cached.isStale) {
      void computeRecommendations()
        .then(async (data) => {
          await setRecommendationCache(
            redis,
            cacheKey,
            { recommendations: data, cachedAt: Date.now(), context },
            cacheOptions
          );
        })
        .catch((error) => console.warn('[recommendations] Failed to refresh cache:', error));

      const response = NextResponse.json({
        recommendations: cached.recommendations,
        context,
        cache: { hit: true, age: cached.age, stale: true },
      });
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      return response;
    }

    const recommendations = await computeRecommendations();
    await setRecommendationCache(
      redis,
      cacheKey,
      { recommendations, cachedAt: Date.now(), context },
      cacheOptions
    );

    const response = NextResponse.json({
      recommendations,
      context,
      cache: { hit: false },
    });

    response.headers.set(
      'Cache-Control',
      context === 'personalized'
        ? 'private, max-age=60, stale-while-revalidate=300'
        : 'public, s-maxage=300, stale-while-revalidate=600'
    );

    return response;
  }

  const recommendations = await computeRecommendations();

  const response = NextResponse.json({
    recommendations,
    context,
  });

  response.headers.set(
    'Cache-Control',
    context === 'personalized'
      ? 'private, max-age=60, stale-while-revalidate=300'
      : 'public, s-maxage=300, stale-while-revalidate=600'
  );

  return response;
});

async function fetchUserPreferences(
  supabase: SupabaseServerClient,
  userId: string
): Promise<UserPreferenceProfile | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data as UserPreferenceProfile | null) ?? null;
}

async function resolvePreferenceEmbedding(
  supabase: SupabaseServerClient,
  userId: string,
  existingEmbedding: unknown
): Promise<number[] | null> {
  const parsedExisting = toNumberArray(existingEmbedding);
  if (parsedExisting) {
    return parsedExisting;
  }

  const vectors: number[][] = [];

  try {
    const { data, error } = await supabase
      .from('saved_destinations')
      .select('destination:destinations(embedding)')
      .eq('user_id', userId)
      .not('destination.embedding', 'is', null)
      .limit(25);

    if (error) throw error;

    (data as Array<{ destination: { embedding: number[] | null } | null }> | null)?.forEach(({ destination }) => {
      const vector = toNumberArray(destination?.embedding);
      if (vector) vectors.push(vector);
    });
  } catch (error) {
    console.warn('[recommendations] Unable to fetch saved destination embeddings:', error);
  }

  try {
    const { data, error } = await supabase
      .from('visit_history')
      .select('destination:destinations(embedding)')
      .eq('user_id', userId)
      .not('destination.embedding', 'is', null)
      .order('visited_at', { ascending: false })
      .limit(25);

    if (error) throw error;

    (data as Array<{ destination: { embedding: number[] | null } | null }> | null)?.forEach(({ destination }) => {
      const vector = toNumberArray(destination?.embedding);
      if (vector) vectors.push(vector);
    });
  } catch (error) {
    console.warn('[recommendations] Unable to fetch visit history embeddings:', error);
  }

  if (vectors.length === 0) {
    return null;
  }

  const dimension = vectors[0].length;
  const accumulator = new Array(dimension).fill(0);
  let usable = 0;

  vectors.forEach((vector) => {
    if (vector.length === dimension) {
      usable += 1;
      for (let i = 0; i < dimension; i += 1) {
        accumulator[i] += vector[i];
      }
    }
  });

  if (usable === 0) {
    return null;
  }

  return accumulator.map((value) => value / usable);
}

async function fetchDestinationCandidates(
  supabase: SupabaseServerClient,
  categories: string[],
  limit: number
): Promise<DestinationWithFeatures[]> {
  let query = supabase
    .from('destinations')
    .select(
      'slug, name, city, country, category, tags, metadata, trending_score, rating, embedding, feature_vector, updated_at, created_at'
    )
    .not('embedding', 'is', null)
    .order('trending_score', { ascending: false, nullsLast: true })
    .limit(limit);

  if (categories.length > 0) {
    query = query.in('category', categories);
  }

  const { data, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data ?? []) as DestinationWithFeatures[];
}

async function fetchTrendingDestinations(
  supabase: SupabaseServerClient,
  categories: string[],
  limit: number
): Promise<DestinationWithFeatures[]> {
  let query = supabase
    .from('destinations')
    .select(
      'slug, name, city, country, category, tags, metadata, trending_score, rating, embedding, feature_vector, updated_at, created_at'
    )
    .order('trending_score', { ascending: false, nullsLast: true })
    .order('rating', { ascending: false, nullsLast: true })
    .limit(limit);

  if (categories.length > 0) {
    query = query.in('category', categories);
  }

  const { data, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data ?? []) as DestinationWithFeatures[];
}

function toNumberArray(input: unknown): number[] | null {
  if (Array.isArray(input) && input.every((value) => typeof value === 'number')) {
    return input as number[];
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'number')) {
        return parsed as number[];
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}
