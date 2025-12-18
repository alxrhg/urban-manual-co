import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { conversationRatelimit, memoryConversationRatelimit, isUpstashConfigured } from '@/lib/rate-limit';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    });
  }
  return next({ 
    ctx: { 
      ...ctx, 
      userId: ctx.userId // Type narrowing - userId is now guaranteed to be non-null
    } 
  });
});

/**
 * Rate limited procedure for AI/expensive endpoints.
 * Enforces stricter limits than standard routes.
 */
export const rateLimitedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const limiter = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  // Use user ID for authenticated users, fall back to "anonymous" (though protectedProcedure ensures user)
  const identifier = ctx.userId ? `user:${ctx.userId}` : 'anonymous';

  const { success } = await limiter.limit(identifier);

  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  return next();
});
