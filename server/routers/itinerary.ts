import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { generateTimeline } from '@/services/itinerary/timeline';
import type { TimelinePlan } from '@/services/itinerary/timeline';
import { protectedProcedure, router } from '../trpc';

const preferenceSchema = z.object({
  dayStartHour: z.number().int().min(0).max(23).optional(),
  dayEndHour: z.number().int().min(0).max(23).optional(),
  breakMinutes: z.number().int().min(0).max(240).optional(),
  maxPerDay: z.number().int().min(1).max(12).optional(),
  preferredCategories: z.array(z.string()).optional(),
  pace: z.enum(['relaxed', 'balanced', 'intense']).optional(),
  partySize: z.number().int().min(1).max(12).optional(),
});

const timelineEventSchema = z.object({
  id: z.string(),
  dayId: z.string(),
  dayIndex: z.number().int().min(1),
  date: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attractionId: z.string().optional().nullable(),
  destinationSlug: z.string(),
  availability: z.any().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

function normalizeDestinationSlug(destination?: string | null): string | null {
  if (!destination) return null;
  return destination
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapPlanToEvents(plan: TimelinePlan) {
  const timestamp = new Date().toISOString();
  return plan.days.flatMap(day =>
    day.events.map(event => ({
      id: event.id,
      trip_id: plan.tripId,
      day_index: day.index,
      event_date: new Date(`${day.date}T00:00:00Z`).toISOString(),
      starts_at: event.startsAt ?? null,
      ends_at: event.endsAt ?? null,
      title: event.title,
      description: event.description ?? null,
      notes: event.notes ?? null,
      attraction_id: event.metadata?.attractionId ?? null,
      destination_slug: plan.destinationSlug,
      availability: event.availability ? JSON.stringify(event.availability) : null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      created_at: timestamp,
      updated_at: timestamp,
    })),
  );
}

export const itineraryRouter = router({
  get: protectedProcedure
    .input(z.object({ tripId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, user_id, title, destination, start_date, end_date')
        .eq('id', input.tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (tripError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tripError.message });
      }
      if (!trip) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trip not found' });
      }

      const { data: events, error: eventsError } = await supabase
        .from('itinerary_events')
        .select('*')
        .eq('trip_id', trip.id)
        .order('event_date', { ascending: true })
        .order('starts_at', { ascending: true });

      if (eventsError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eventsError.message });
      }

      const grouped = new Map<string, { dayIndex: number; events: typeof events }>();
      events?.forEach(event => {
        const date = new Date(event.event_date).toISOString().split('T')[0];
        if (!grouped.has(date)) {
          grouped.set(date, { dayIndex: event.day_index, events: [] });
        }
        grouped.get(date)!.events.push(event);
      });

      const days = Array.from(grouped.entries())
        .sort(([dateA], [dateB]) => (dateA < dateB ? -1 : 1))
        .map(([date, payload], index) => ({
          id: `timeline-day-${index + 1}`,
          label: `Day ${index + 1}`,
          date,
          index: payload.dayIndex ?? index + 1,
          events: payload.events.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description ?? undefined,
            startsAt: event.starts_at ?? new Date(date).toISOString(),
            endsAt: event.ends_at ?? undefined,
            notes: event.notes ?? undefined,
            durationMinutes: undefined,
            metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
            availability: event.availability ? JSON.parse(event.availability) : undefined,
            dayIndex: payload.dayIndex ?? index + 1,
          })),
        }));

      return {
        trip: {
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.start_date,
          endDate: trip.end_date,
        },
        timeline: events && events.length > 0
          ? {
              tripId: trip.id,
              destinationSlug: normalizeDestinationSlug(trip.destination ?? undefined) ?? '',
              startDate: trip.start_date ?? new Date().toISOString(),
              endDate: trip.end_date ?? new Date().toISOString(),
              days,
              unplacedAttractions: [],
              preferences: {
                dayStartHour: 9,
                dayEndHour: 20,
                breakMinutes: 60,
                maxPerDay: 4,
                preferredCategories: [],
                pace: 'balanced',
                partySize: 2,
              },
              generatedAt: events[0]?.created_at ?? new Date().toISOString(),
            }
          : null,
      };
    }),
  generate: protectedProcedure
    .input(
      z.object({
        tripId: z.number().int(),
        destinationSlug: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        preferences: preferenceSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, user_id, destination, start_date, end_date')
        .eq('id', input.tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (tripError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tripError.message });
      }
      if (!trip) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trip not found' });
      }

      const destinationSlug = input.destinationSlug
        ?? normalizeDestinationSlug(trip.destination ?? undefined)
        ?? 'paris';
      const startDate = input.startDate ?? trip.start_date ?? new Date().toISOString();
      const endDate = input.endDate ?? trip.end_date ?? startDate;

      const plan = await generateTimeline({
        tripId: input.tripId,
        destinationSlug,
        startDate,
        endDate,
        preferences: input.preferences,
      });

      await supabase.from('itinerary_events').delete().eq('trip_id', input.tripId);

      const rows = mapPlanToEvents(plan);
      const timestamp = new Date().toISOString();
      rows.forEach(row => {
        row.created_at = row.created_at ?? timestamp;
        row.updated_at = timestamp;
      });

      if (rows.length) {
        const insert = await supabase.from('itinerary_events').insert(rows);
        if (insert.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insert.error.message });
        }
      }

      await supabase
        .from('trips')
        .update({ updated_at: new Date().toISOString(), destination: trip.destination })
        .eq('id', input.tripId);

      return { plan };
    }),
  save: protectedProcedure
    .input(
      z.object({
        tripId: z.number().int(),
        events: z.array(timelineEventSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, user_id, destination')
        .eq('id', input.tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (tripError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tripError.message });
      }
      if (!trip) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trip not found' });
      }

      const rows = input.events.map(event => ({
        id: event.id,
        trip_id: input.tripId,
        day_index: event.dayIndex,
        event_date: new Date(`${event.date}T00:00:00Z`).toISOString(),
        starts_at: event.startsAt ?? null,
        ends_at: event.endsAt ?? null,
        title: event.title,
        description: event.description ?? null,
        notes: event.notes ?? null,
        attraction_id: event.attractionId ?? null,
        destination_slug: event.destinationSlug,
        availability: event.availability ? JSON.stringify(event.availability) : null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        created_at: event.startsAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      if (rows.length) {
        const upsert = await supabase.from('itinerary_events').upsert(rows, { onConflict: 'id' });
        if (upsert.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: upsert.error.message });
        }
      }

      const { data: existing, error: existingError } = await supabase
        .from('itinerary_events')
        .select('id')
        .eq('trip_id', input.tripId);

      if (existingError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message });
      }

      const keepIds = new Set(input.events.map(event => event.id));
      const staleIds = (existing ?? []).map(row => row.id).filter(id => !keepIds.has(id));
      if (staleIds.length) {
        await supabase.from('itinerary_events').delete().in('id', staleIds);
      }

      await supabase
        .from('trips')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', input.tripId);

      return { success: true };
    }),
});
