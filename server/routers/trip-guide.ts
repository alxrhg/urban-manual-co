import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { SmartTripGuideAIService } from '@/services/ai/trip-guide';
import { TripPreferencePayload } from '@/types/trip-guide';

const aiService = new SmartTripGuideAIService();

const preferenceSchema = z.object({
  text: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  budget: z.string().optional(),
  priceLevel: z.number().min(1).max(4).optional(),
  averagePrice: z.number().min(0).optional(),
  groupSize: z.number().min(1).max(100).optional(),
  days: z.number().min(1).max(30).optional(),
});

type DestinationRecord = {
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string | null;
  image?: string | null;
  primary_photo_url?: string | null;
  tags?: string[] | null;
  price_level?: number | null;
  rating?: number | null;
};

export const tripGuideRouter = router({
  plan: publicProcedure
    .input(z.object({
      preferences: preferenceSchema,
      limit: z.number().min(3).max(30).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const preferences: TripPreferencePayload = {
        ...input.preferences,
      };

      const criteria = await aiService.parsePreferences(preferences);

      let query = supabase
        .from('destinations')
        .select(
          'slug, name, city, category, description, image, primary_photo_url, tags, price_level, rating',
        );

      if (criteria.city) {
        query = query.ilike('city', `%${criteria.city}%`);
      }

      if (criteria.category) {
        query = query.ilike('category', `%${criteria.category}%`);
      }

      if (criteria.tags.length > 0) {
        query = query.contains('tags', criteria.tags);
      }

      if (criteria.maxPriceLevel !== undefined) {
        query = query.lte('price_level', criteria.maxPriceLevel);
      }

      if (criteria.minPriceLevel !== undefined) {
        query = query.gte('price_level', criteria.minPriceLevel);
      }

      const { data, error } = await query.limit(input.limit ?? 12);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch destinations',
          cause: error,
        });
      }

      const destinationData = (data || []) as DestinationRecord[];
      const filteredData = destinationData.filter((destination) => {
        if (!criteria.keywords.length) return true;

        const haystack = [
          destination.name,
          destination.city,
          destination.category,
          destination.description,
          ...(destination.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matches = criteria.keywords.filter((keyword) => haystack.includes(keyword));
        const minimumMatches = Math.min(2, criteria.keywords.length);
        return matches.length >= minimumMatches;
      });

      const prepared = aiService.prepareDestinations(filteredData);
      const itinerarySummary = await aiService.summarizeItinerary(prepared, criteria);

      return {
        criteria,
        destinations: prepared,
        itinerarySummary,
      };
    }),
});

