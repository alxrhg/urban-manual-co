import { NextRequest } from 'next/server';
import { checkAndAwardAchievements } from '@/lib/achievements';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';
import { withAuth, AuthContext, createSuccessResponse } from '@/lib/errors';

export const POST = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user.id,
    message: 'Too many achievement checks. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Check and award achievements
  const newlyUnlocked = await checkAndAwardAchievements(user.id);

  return createSuccessResponse({
    newlyUnlocked: newlyUnlocked.length,
    achievements: newlyUnlocked,
  });
});

