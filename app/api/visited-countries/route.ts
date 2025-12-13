import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, AuthContext, createSuccessResponse, createValidationError } from '@/lib/errors';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

/**
 * GET /api/visited-countries
 * Fetch user's visited countries
 */
export const GET = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user.id,
    message: 'Too many visited country requests. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const supabase = await createServerClient();

  const { data: visitedCountries, error } = await supabase
    .from('visited_countries')
    .select('country_code, country_name, visited_at')
    .eq('user_id', user.id)
    .order('visited_at', { ascending: false });

  if (error) throw error;

  return createSuccessResponse({
    countries: visitedCountries || [],
    count: visitedCountries?.length || 0,
  });
});

/**
 * POST /api/visited-countries
 * Add a visited country
 */
export const POST = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user.id,
    message: 'Too many visited country updates. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = await request.json();
  const { country_code, country_name } = body;

  if (!country_code || !country_name) {
    throw createValidationError('Missing country_code or country_name');
  }

  const supabase = await createServerClient();

  // Upsert (insert or update if exists)
  const { data, error } = await supabase
    .from('visited_countries')
    .upsert({
      user_id: user.id,
      country_code: country_code.toUpperCase(),
      country_name,
      visited_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,country_code',
    })
    .select()
    .single();

  if (error) throw error;

  return createSuccessResponse({
    country: data,
  });
});

