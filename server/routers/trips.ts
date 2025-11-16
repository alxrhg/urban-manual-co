
import { createRouter } from '../trpc';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const tripsRouter = createRouter()
  .query('getTripsByUser', {
    input: z.object({
      userId: z.string(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('trips')
        .select('id, user_id, title, description, destination, start_date, end_date, status, is_public, cover_image, created_at, updated_at')
        .eq('user_id', input.userId);

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .query('getTrip', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          itinerary_items:itinerary_items(*,
            destination:destinations(name, city, latitude, longitude)
          )
        `)
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .mutation('createTrip', {
    input: z.object({
      title: z.string(),
      description: z.string().optional(),
      destination: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
      user_id: z.string(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            title: input.title,
            description: input.description,
            destination: input.destination,
            start_date: input.start_date,
            end_date: input.end_date,
            user_id: input.user_id,
          },
        ])
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .mutation('updateTrip', {
    input: z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      destination: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('trips')
        .update({
          title: input.title,
          description: input.description,
          destination: input.destination,
          start_date: input.start_date,
          end_date: input.end_date,
        })
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .mutation('deleteTrip', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('trips')
        .delete()
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .mutation('deleteItineraryItem', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .mutation('addItineraryItem', {
    input: z.object({
      trip_id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      day: z.number(),
      order_index: z.number(),
    }),
    async resolve({ input }) {
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert([
          {
            trip_id: input.trip_id,
            title: input.title,
            description: input.description,
            day: input.day,
            order_index: input.order_index,
          },
        ])
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  })
  .mutation('updateItineraryOrder', {
    input: z.object({
      trip_id: z.string(),
      ordered_ids: z.array(z.string()),
    }),
    async resolve({ input }) {
      const updates = input.ordered_ids.map((id, index) =>
        supabase
          .from('itinerary_items')
          .update({ order_index: index })
          .eq('id', id)
      );
      const results = await Promise.all(updates);
      const error = results.find((res) => res.error);
      if (error) {
        throw new Error(error.error.message);
      }
      return { success: true };
    },
  });
