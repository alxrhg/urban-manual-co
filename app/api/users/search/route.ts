import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createSuccessResponse } from '@/lib/errors';
import {
  searchRatelimit,
  memorySearchRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  if (!query.trim()) {
    return createSuccessResponse({ users: [] });
  }

  const rateLimitResponse = await enforceRateLimit({
    request: req,
    message: 'Too many user search requests. Please wait a moment.',
    limiter: searchRatelimit,
    memoryLimiter: memorySearchRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const supabase = await createServerClient();

  // Search for users by username or display_name
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('user_id, username, display_name, bio, avatar_url, location, follower_count, following_count, is_public')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .eq('is_public', true)
    .limit(20);

  if (error) throw error;

  return createSuccessResponse({ users: users || [] });
});
