import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { SupabaseAIService } from '@/server/services/ai/ai.service';

export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      const aiService = new SupabaseAIService(supabase);
      
      return await aiService.processChat({
        message: input.message,
        userId,
        sessionId: input.sessionId,
      });
    }),

  getSuggestedPrompts: protectedProcedure
    .query(async ({ ctx }) => {
      const { supabase, userId } = ctx;
      
      if (!userId) {
        return [];
      }

      const aiService = new SupabaseAIService(supabase);
      return await aiService.getSuggestedPrompts(userId);
    }),
});
