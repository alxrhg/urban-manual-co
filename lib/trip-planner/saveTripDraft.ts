import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  InsertItineraryItem,
  InsertTrip,
  Trip,
} from '@/types/trip';

export interface PlannerStopInput {
  id: string;
  title: string;
  slug?: string;
  city?: string;
  category?: string;
  image?: string;
  source: 'saved' | 'search';
}

export interface PlannerDayInput {
  dayNumber: number;
  date: string | null;
  items: PlannerStopInput[];
}

export interface FlightDraft {
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
}

export interface HotelDraft {
  name: string;
  checkIn: string;
  checkOut: string;
}

export interface TripPlannerRepository {
  insertTrip: (payload: InsertTrip) => Promise<Trip>;
  insertItineraryItems: (payload: InsertItineraryItem[]) => Promise<void>;
}

export function createTripPlannerRepository(
  client: SupabaseClient
): TripPlannerRepository {
  return {
    insertTrip: async (payload: InsertTrip) => {
      const { data, error } = await client
        .from('trips')
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        throw error ?? new Error('Trip not created');
      }

      return data as Trip;
    },
    insertItineraryItems: async (items: InsertItineraryItem[]) => {
      if (!items.length) return;

      const { error } = await client
        .from('itinerary_items')
        .insert(items);

      if (error) throw error;
    },
  };
}

export interface SaveTripDraftArgs {
  repo: TripPlannerRepository;
  userId: string;
  tripName: string;
  tripCity: string;
  startDate: string;
  endDate?: string;
  days: PlannerDayInput[];
  hotel: HotelDraft;
  flight: FlightDraft;
}

export async function saveTripDraft({
  repo,
  userId,
  tripName,
  tripCity,
  startDate,
  endDate,
  days,
  hotel,
  flight,
}: SaveTripDraftArgs): Promise<{ tripId: string }> {
  const payload: InsertTrip = {
    user_id: userId,
    title: tripName.trim() || `Trip to ${tripCity || 'New Trip'}`,
    destination: tripCity || null,
    start_date: startDate,
    end_date: endDate || startDate,
    status: 'planning',
    is_public: false,
  };

  const tripRecord = await repo.insertTrip(payload);

  const itineraryPayload: InsertItineraryItem[] = [];

  days.forEach((day) => {
    day.items.forEach((item, index) => {
      itineraryPayload.push({
        trip_id: tripRecord.id,
        destination_slug: item.slug || null,
        day: day.dayNumber,
        order_index: index,
        title: item.title,
        description: item.city || tripCity || null,
        notes: JSON.stringify({
          type: 'place',
          image: item.image,
          city: item.city,
          category: item.category,
          slug: item.slug,
        }),
      });
    });
  });

  if (hotel.name.trim()) {
    itineraryPayload.push({
      trip_id: tripRecord.id,
      destination_slug: null,
      day: 1,
      order_index: 0,
      title: hotel.name.trim(),
      description: tripCity || '',
      notes: JSON.stringify({
        type: 'hotel',
        checkInTime: hotel.checkIn,
        checkOutTime: hotel.checkOut,
      }),
    });
  }

  if (
    flight.airline.trim() &&
    flight.from.trim() &&
    flight.to.trim()
  ) {
    itineraryPayload.push({
      trip_id: tripRecord.id,
      destination_slug: null,
      day: 1,
      order_index: 0,
      title: `${flight.airline} ${flight.flightNumber || ''}`.trim(),
      description: `${flight.from} → ${flight.to}`,
      time: flight.departureTime || null,
      notes: JSON.stringify({
        type: 'flight',
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        from: flight.from,
        to: flight.to,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        arrivalDate: flight.arrivalDate,
        arrivalTime: flight.arrivalTime,
      }),
    });
  }

  await repo.insertItineraryItems(itineraryPayload);

  return { tripId: tripRecord.id };
}
