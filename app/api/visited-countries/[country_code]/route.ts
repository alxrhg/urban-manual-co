import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, AuthContext, createSuccessResponse, createValidationError } from '@/lib/errors';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

/**
 * DELETE /api/visited-countries/[country_code]
 * Remove a visited country
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  { user }: AuthContext,
  { params }: { params: Promise<{ country_code: string }> }
) => {
  const { country_code } = await params;

  if (!country_code) {
    throw createValidationError('Missing country_code');
  }

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

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('visited_countries')
    .delete()
    .eq('user_id', user.id)
    .eq('country_code', country_code.toUpperCase());

  if (error) throw error;

  return createSuccessResponse({
    message: 'Country removed from visited list',
  });
});

