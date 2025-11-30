import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { AIRecommendationEngine } from '@/lib/ai-recommendations/engine';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from '@/lib/rate-limit';

// Helper to check rate limit using Upstash or memory fallback
async function checkDistributedRateLimit(request: NextRequest, userId: string) {
  const identifier = getIdentifier(request, userId);
  const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  return await ratelimit.limit(identifier);
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Get query parameters first (for slug-based recommendations)
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // If slug is provided, use related destinations endpoint instead
  if (slug) {
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

  // 3. Check rate limit using distributed rate limiting
  const { success, limit: rateLimit, remaining, reset } = await checkDistributedRateLimit(request, user.id);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.', rateLimitExceeded: true },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const forceRefresh = searchParams.get('refresh') === 'true';
  const filterCity = searchParams.get('city');

  // Validate limit
  if (limit < 1 || limit > 50) {
    throw createValidationError('Limit must be between 1 and 50');
  }

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

  // 7. Combine scores with destinations using Map for O(1) lookups
  const destinationMap = new Map((destinations || []).map((d: any) => [d.id, d]));
  let result = recommendations.map(rec => {
    const destination = destinationMap.get(rec.destinationId);
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

  // Check rate limit using distributed rate limiting (stricter for POST)
  const { success, limit: rateLimit, remaining, reset } = await checkDistributedRateLimit(request, user.id);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', rateLimitExceeded: true },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const body = await request.json().catch(() => ({}));
  const limit = parseInt(body.limit || '20', 10);

  const engine = new AIRecommendationEngine(user.id);
  const recommendations = await engine.generateRecommendations(limit);

  // Fetch destinations
  const destinationIds = recommendations.map(r => r.destinationId);
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .in('id', destinationIds);

  // Use Map for O(1) lookups
  const destinationMap = new Map((destinations || []).map((d: any) => [d.id, d]));
  const result = recommendations.map(rec => {
    const destination = destinationMap.get(rec.destinationId);
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
