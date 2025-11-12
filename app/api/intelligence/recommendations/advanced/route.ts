import { NextRequest, NextResponse } from 'next/server';
import { advancedRecommendationEngine } from '@/services/intelligence/recommendations-advanced';
import { createServerClient } from '@/lib/supabase-server';

interface PreferenceWeightsPayload {
  cities?: Record<string, number>;
  categories?: Record<string, number>;
  selectedKeys?: string[];
}

interface RecommendationRequestConfig {
  limit?: number;
  city?: string;
  category?: string;
  excludeVisited?: boolean;
  excludeSaved?: boolean;
  preferenceWeights?: PreferenceWeightsPayload;
}

type RecommendationResponseItem = {
  destination: Record<string, unknown>;
  score: number;
  reason?: string;
  factors: unknown;
};

function buildReasonFragments(
  destination: Record<string, unknown>,
  weights?: PreferenceWeightsPayload
): string[] {
  if (!weights) {
    return [];
  }

  const fragments: string[] = [];
  const selectedKeys = new Set(weights.selectedKeys || []);

  const city = typeof destination.city === 'string' ? destination.city : undefined;
  const category = typeof destination.category === 'string' ? destination.category : undefined;

  if (city) {
    const cityKey = city.toLowerCase();
    const weight = weights.cities?.[cityKey];
    if (weight && weight > 1 && (selectedKeys.size === 0 || selectedKeys.has(`city-${cityKey}`))) {
      fragments.push(`Because you love ${city}`);
    }
  }

  if (category) {
    const categoryKey = category.toLowerCase();
    const weight = weights.categories?.[categoryKey];
    if (weight && weight > 1 && (selectedKeys.size === 0 || selectedKeys.has(`category-${categoryKey}`))) {
      const label = category.charAt(0).toUpperCase() + category.slice(1);
      fragments.push(`Perfect for ${label} lovers`);
    }
  }

  return fragments;
}

async function buildResponse(
  request: NextRequest,
  config: RecommendationRequestConfig
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const limit = Math.max(1, Math.min(config.limit ?? 20, 50));

    const recommendations = await advancedRecommendationEngine.getRecommendations(
      user.id,
      limit,
      {
        city: config.city,
        category: config.category,
        excludeVisited: config.excludeVisited,
        excludeSaved: config.excludeSaved,
      }
    );

    if (!recommendations.length) {
      return NextResponse.json({
        recommendations: [],
        count: 0,
        experimentVariant: request.headers.get('x-experiment-variant') || undefined,
      });
    }

    const destinationIds = recommendations.map((rec) => rec.destination_id);
    const { data: destinations } = await supabase
      .from('destinations')
      .select('*')
      .in('id', destinationIds);

    const results = recommendations
      .map((rec) => {
        const destination = destinations?.find((d) => d.id === rec.destination_id) as
          | Record<string, unknown>
          | undefined;
        if (!destination) {
          return null;
        }

        const reasonFragments = buildReasonFragments(destination, config.preferenceWeights);
        const combinedReason = [
          ...reasonFragments,
          rec.reason,
        ]
          .filter(Boolean)
          .join(' • ');

        const score = (() => {
          let currentScore = rec.score;
          const city = typeof destination.city === 'string' ? destination.city.toLowerCase() : undefined;
          if (city && config.preferenceWeights?.cities?.[city]) {
            currentScore *= config.preferenceWeights.cities[city];
          }
          const category = typeof destination.category === 'string' ? destination.category.toLowerCase() : undefined;
          if (category && config.preferenceWeights?.categories?.[category]) {
            currentScore *= config.preferenceWeights.categories[category];
          }
          return currentScore;
        })();

        return {
          destination,
          score,
          reason: combinedReason || rec.reason,
          factors: rec.factors,
        };
      })
      .filter((value): value is RecommendationResponseItem => Boolean(value));

    return NextResponse.json({
      recommendations: results,
      count: results.length,
      experimentVariant: request.headers.get('x-experiment-variant') || undefined,
    });
  } catch (error: unknown) {
    console.error('Error getting advanced recommendations:', error);
    return NextResponse.json(
      {
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return buildResponse(request, {
    limit: parseInt(searchParams.get('limit') || '20', 10),
    city: searchParams.get('city') || undefined,
    category: searchParams.get('category') || undefined,
    excludeVisited: searchParams.get('exclude_visited') === 'true',
    excludeSaved: searchParams.get('exclude_saved') === 'true',
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;

  return buildResponse(request, {
    limit: typeof body.limit === 'number' ? body.limit : undefined,
    city: typeof body.city === 'string' ? body.city : undefined,
    category: typeof body.category === 'string' ? body.category : undefined,
    excludeVisited: Boolean(body.excludeVisited),
    excludeSaved: Boolean(body.excludeSaved),
    preferenceWeights: body.preferenceWeights as PreferenceWeightsPayload | undefined,
  });
}

