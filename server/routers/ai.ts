import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { generateDestinationEmbedding } from '@/lib/embeddings/generate';

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

      // Generate or use existing session ID
      const sessionId = input.sessionId || crypto.randomUUID();
      
      // Upsert conversation session
      await supabase.from('conversation_sessions').upsert({
        id: sessionId,
        user_id: userId,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
      
      // Save user message
      await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        user_id: userId,
        message_text: input.message,
        message_type: 'user',
      });

      // Get user's saved places for context
      const { data: savedPlaces } = await supabase
        .rpc('get_user_saved_destinations', { target_user_id: userId })
        .catch(() => ({ data: null }));

      // Generate embedding for search
      const embedding = await generateDestinationEmbedding({
        name: input.message,
        city: '',
        category: '',
        content: input.message,
      });

      // Hybrid search using the new function
      // Note: This requires migration 024_hybrid_search_function.sql to be run
      let results: any[] = [];
      try {
        const { data, error: searchError } = await supabase
          .rpc('search_destinations_hybrid', {
            query_embedding: `[${embedding.join(',')}]`,
            user_id_param: userId,
            limit_count: 10,
            boost_saved: true,
          });
        
        if (!searchError && data) {
          results = data;
        } else if (searchError) {
          console.error('Hybrid search error:', searchError);
          // Fallback: Use existing match_destinations if hybrid search not available
          const { data: fallbackResults } = await supabase.rpc('match_destinations', {
            query_embedding: embedding,
            match_threshold: 0.6,
            match_count: 10,
          }).catch(() => ({ data: null }));
          results = fallbackResults || [];
        }
      } catch (error) {
        console.error('Search error:', error);
      }


      // Generate response text
      const responseText = results && results.length > 0
        ? `Found ${results.length} place${results.length === 1 ? '' : 's'} matching "${input.message}"`
        : "I can help you find places. Try asking about a specific city or category.";

      // Save assistant message
      await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        user_id: userId,
        message_text: responseText,
        message_type: 'assistant',
      });

      return { 
        sessionId, 
        response: responseText, 
        results: results || [] 
      };
    }),

  getSuggestedPrompts: protectedProcedure
    .query(async ({ ctx }) => {
      const { supabase, userId } = ctx;
      
      if (!userId) {
        return [];
      }

      // Get user's saved cities
      const { data: savedPlaces } = await supabase
        .rpc('get_user_saved_destinations', { target_user_id: userId })
        .catch(() => ({ data: null }));

      const cities = [
        ...new Set(
          (savedPlaces?.data || [])
            .map((p: any) => p.city)
            .filter(Boolean)
        )
      ];

      const prompts: string[] = [];

      if (cities.length > 0) {
        prompts.push(`Show me new places in ${cities[0]}`);
      }

      prompts.push(
        'Find Michelin restaurants',
        'Show my saved places',
        'Plan a weekend itinerary',
      );

      return prompts.filter(Boolean);
    }),
});

