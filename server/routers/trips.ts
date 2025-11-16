
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { TRPCError } from '@trpc/server';

export const tripsRouter = router({
  getTripsByUser: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, user_id, title, description, destination, start_date, end_date, status, is_public, cover_image, created_at, updated_at')
        .eq('user_id', ctx.userId);

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }),
  getTrip: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          itinerary_items:itinerary_items(*,
            destination:destinations(name, city, latitude, longitude)
          )
        `)
        .eq('id', input.id)
        .eq('user_id', ctx.userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }),
  createTrip: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      destination: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabase
        .from('trips')
        .insert([
          {
            title: input.title,
            description: input.description,
            destination: input.destination,
            start_date: input.start_date,
            end_date: input.end_date,
            user_id: ctx.userId,
          },
        ])
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }),
  updateTrip: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      destination: z.string().optional(),
      start_date: z.string(),
      end_date: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      const { data: existingTrip, error: fetchError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', input.id)
        .single();
      if (fetchError || !existingTrip || existingTrip.user_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to edit this trip.' });
      }

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
    }),
  deleteTrip: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      const { data: existingTrip, error: fetchError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', input.id)
        .single();
      if (fetchError || !existingTrip || existingTrip.user_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to delete this trip.' });
      }

      const { data, error } = await supabase
        .from('trips')
        .delete()
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }),
  deleteItineraryItem: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      const { data: item, error: fetchError } = await supabase
        .from('itinerary_items')
        .select('trip_id')
        .eq('id', input.id)
        .single();
      if (fetchError || !item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Itinerary item not found.' });
      }
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', item.trip_id)
        .single();
      if (tripError || !trip || trip.user_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to delete this item.' });
      }

      const { data, error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }),
  addItineraryItem: protectedProcedure
    .input(z.object({
      trip_id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      day: z.number(),
      order_index: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', input.trip_id)
        .single();
      if (tripError || !trip || trip.user_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to add items to this trip.' });
      }

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
    }),
  updateItineraryOrder: protectedProcedure
    .input(z.object({
      trip_id: z.string(),
      ordered_ids: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', input.trip_id)
        .single();
      if (tripError || !trip || trip.user_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to reorder items in this trip.' });
      }

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
    }),
});
