import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { AIRecommendationEngine } from '@/lib/ai-recommendations/engine';
import { withErrorHandling } from '@/lib/errors';
import { filtersSchema, parseJsonBody, parseSearchParams, createLimitSchema } from '@/lib/utils/validation';
import { z } from 'zod';

const recommendationQuerySchema = z.object({
  slug: z
    .string({ invalid_type_error: 'Slug must be a string' })
    .trim()
    .min(1, 'Slug cannot be empty')
    .optional(),
  limit: createLimitSchema({ max: 50, defaultValue: 20, label: 'limit' }),
  refresh: z.coerce.boolean().default(false),
  city: filtersSchema.shape.city,
});

const recommendationBodySchema = z.object({
  limit: createLimitSchema({ max: 50, defaultValue: 20, label: 'limit' }),
});

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit || now > limit.resetAt) {
    // Reset limit (5 requests per hour)
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + 60 * 60 * 1000
    });
    return true;
  }
  
  if (limit.count >= 5) {
    return false;
  }
  
  limit.count++;
  return true;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Get query parameters first (for slug-based recommendations)
  const { slug, limit, refresh, city } = parseSearchParams(
    request,
    recommendationQuerySchema,
    { errorMessage: 'Invalid recommendations query' }
  );

  // If slug is provided, use related destinations endpoint instead
  if (slug) {
    try {
      const supabase = await createServerClient();
      const { data: destination } = await supabase
        .from('destinations')
        .select('id, city, category')
        .eq('slug', slug)
        .single();

      if (!destination) {
        return NextResponse.json({ recommendations: [], count: 0 });
      }

      // Get related destinations
      const { data: related } = await supabase
        .from('destinations')
        .select('*')
        .or(`city.eq.${destination.city},category.eq.${destination.category}`)
        .neq('slug', slug)
        .limit(limit);

      return NextResponse.json({
        recommendations: (related || []).map(d => ({ destination: d })),
        count: related?.length || 0
      });
    } catch (error: any) {
      console.error('[API] Related destinations error:', error);
      return NextResponse.json({ recommendations: [], count: 0 });
    }
  }

  // 2. Authenticate user for personalized recommendations
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 3. Check rate limit
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  const forceRefresh = refresh;
  const filterCity = city;

  // 4. Initialize engine
  const engine = new AIRecommendationEngine(user.id);

  // 5. Check if refresh needed
  const needsRefresh = forceRefresh || await engine.needsRefresh();

  let recommendations;

  if (needsRefresh) {
    // Generate new recommendations
    console.log('[API] Generating new recommendations...');
    recommendations = await engine.generateRecommendations(filterCity ? limit * 2 : limit);
  } else {
    // Use cached recommendations
    console.log('[API] Using cached recommendations...');
    recommendations = await engine.getCachedRecommendations(filterCity ? limit * 2 : limit);
  }

  // 6. Fetch full destination data (with RLS enforced)
  const destinationIds = recommendations.map(r => r.destinationId);

  if (destinationIds.length === 0) {
    return NextResponse.json({
      recommendations: [],
      cached: !needsRefresh,
      count: 0
    });
  }

  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('*')
    .in('id', destinationIds);

  if (destError) {
    console.error('[API] Error fetching destinations:', destError);
    return NextResponse.json({
      recommendations: [],
      cached: !needsRefresh,
      count: 0
    });
  }

  // 7. Combine scores with destinations
  let result = recommendations.map(rec => {
    const destination = destinations?.find((d: any) => d.id === rec.destinationId);
    return {
      ...rec,
      destination
    };
  }).filter(r => r.destination); // Remove any missing destinations

  // 8. Filter by city if specified
  if (filterCity) {
    result = result.filter(rec =>
      rec.destination?.city?.toLowerCase() === filterCity.toLowerCase()
    ).slice(0, limit);
  }

  return NextResponse.json({
    recommendations: result,
    cached: !needsRefresh,
    count: result.length
  });
});

// Force refresh endpoint (POST)
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check rate limit (stricter for POST)
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  const { limit } = await parseJsonBody(request, recommendationBodySchema, {
    errorMessage: 'Invalid recommendations payload',
  });

  const engine = new AIRecommendationEngine(user.id);
  const recommendations = await engine.generateRecommendations(limit);

  // Fetch destinations
  const destinationIds = recommendations.map(r => r.destinationId);
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .in('id', destinationIds);

  const result = recommendations.map(rec => {
    const destination = destinations?.find((d: any) => d.id === rec.destinationId);
    return {
      ...rec,
      destination
    };
  }).filter(r => r.destination);

  return NextResponse.json({
    recommendations: result,
    cached: false,
    count: result.length
  });
});
