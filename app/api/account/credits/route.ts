import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createUnauthorizedError } from '@/lib/errors';
import { getCurrentUserCredits, getCreditHistory } from '@/lib/credits';

/**
 * GET /api/account/credits
 * Get current user's credits and optionally their usage history
 */
export const GET = withErrorHandling(async (request) => {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const includeHistory = request.nextUrl.searchParams.get('history') === 'true';

  const credits = await getCurrentUserCredits();

  if (!credits) {
    throw createUnauthorizedError('Failed to fetch credits');
  }

  const response: {
    credits: typeof credits;
    history?: Awaited<ReturnType<typeof getCreditHistory>>;
  } = { credits };

  if (includeHistory) {
    response.history = await getCreditHistory(user.id, 10);
  }

  return NextResponse.json(response);
});
