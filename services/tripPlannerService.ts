import { createClient } from '@/lib/supabase/client';

export interface TripSummary {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
}

export interface TripRecord extends TripSummary {
  status: string;
  is_public?: boolean;
  cover_image?: string | null;
  created_at?: string;
  budget?: number | null;
}

export interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

export interface TripDetails {
  trip: TripRecord;
  days: DayItinerary[];
}

function parseNotes(notes: string | null, fallbackCity: string, fallbackCategory: string) {
  if (!notes) {
    return {
      raw: '',
      cost: undefined,
      duration: undefined,
      mealType: undefined,
      image: undefined,
      city: fallbackCity || undefined,
      category: fallbackCategory || undefined,
    };
  }

  try {
    const parsed = JSON.parse(notes);
    return {
      raw: typeof parsed === 'string' ? parsed : parsed.raw ?? '',
      cost: parsed.cost,
      duration: parsed.duration,
      mealType: parsed.mealType,
      image: parsed.image,
      city: parsed.city ?? fallbackCity ?? undefined,
      category: parsed.category ?? fallbackCategory ?? undefined,
    };
  } catch {
    return {
      raw: notes,
      cost: undefined,
      duration: undefined,
      mealType: undefined,
      image: undefined,
      city: fallbackCity || undefined,
      category: fallbackCategory || undefined,
    };
  }
}

export async function fetchTripSummaries(userId: string): Promise<TripSummary[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('trips')
    .select('id,title,description,destination,start_date,end_date,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching trip summaries', error);
    throw error;
  }

  return data || [];
}

export async function fetchTripDetails(userId: string, tripId: string): Promise<TripDetails | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('user_id', userId)
    .single();

  if (tripError || !trip) {
    console.error('Error loading trip details', tripError);
    throw tripError || new Error('Trip not found');
  }

  const destination = trip.destination || '';

  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (itemsError) {
    if (!itemsError.message?.includes('infinite recursion')) {
      console.error('Error loading itinerary items:', itemsError);
      throw itemsError;
    }
  }

  const days: DayItinerary[] = [];
  if (items && items.length > 0) {
    const daysMap = new Map<number, TripLocation[]>();
    items.forEach((item) => {
      const day = item.day;
      if (!daysMap.has(day)) {
        daysMap.set(day, []);
      }
      const notesData = parseNotes(item.notes, destination, item.description || '');
      daysMap.get(day)!.push({
        id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
        name: item.title,
        city: notesData.city || destination || '',
        category: notesData.category || item.description || '',
        image: notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
        notes: notesData.raw || undefined,
        cost: notesData.cost || undefined,
        duration: notesData.duration || undefined,
        mealType: notesData.mealType || undefined,
      });
    });

    const start = new Date(trip.start_date || Date.now());
    const end = new Date(trip.end_date || Date.now());
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dayNum = i + 1;
      days.push({
        date: date.toISOString().split('T')[0],
        locations: daysMap.get(dayNum) || [],
        budget: 0,
      });
    }
  } else {
    const start = new Date(trip.start_date || Date.now());
    const end = new Date(trip.end_date || Date.now());
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        locations: [],
        budget: 0,
      });
    }
  }

  return {
    trip,
    days,
  };
}

export interface CreateTripPayload {
  title: string;
  description?: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  status?: string;
  budget?: number | null;
}

export async function createTrip(userId: string, payload: CreateTripPayload) {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('trips')
    .insert({
      ...payload,
      status: payload.status ?? 'planning',
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating trip', error);
    throw error;
  }

  return data;
}

export async function updateTrip(userId: string, tripId: string, payload: Partial<CreateTripPayload>) {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase
    .from('trips')
    .update(payload)
    .eq('id', tripId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating trip', error);
    throw error;
  }
}

export interface ItineraryItemInput {
  trip_id: string;
  destination_slug: string;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string;
  notes: string;
}

export async function replaceItineraryItems(tripId: string, items: ItineraryItemInput[]) {
  const supabase = createClient();
  if (!supabase) return;

  const { error: deleteError } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', tripId);

  if (deleteError) {
    console.error('Error clearing itinerary items', deleteError);
    throw deleteError;
  }

  if (items.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from('itinerary_items')
    .insert(items);

  if (insertError) {
    console.error('Error inserting itinerary items', insertError);
    throw insertError;
  }
}

export interface DestinationInput {
  slug: string;
  name: string;
  city?: string | null;
  category?: string | null;
}

export async function appendDestinationToTrip(
  userId: string,
  tripId: string,
  destination: DestinationInput
) {
  const supabase = createClient();
  if (!supabase) return;

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', userId)
    .single();

  if (tripError || !trip) {
    throw new Error('Trip not found or you do not have permission to modify it');
  }

  let nextDay = 1;
  let nextOrder = 0;
  const { data: nextPositionData, error: nextPositionError } = await supabase.rpc(
    'get_next_itinerary_position',
    { p_trip_id: tripId }
  );

  if (nextPositionError) {
    if (
      nextPositionError.code !== 'PGRST116' &&
      !nextPositionError.message?.includes('infinite recursion')
    ) {
      throw nextPositionError;
    }
  } else if (nextPositionData && typeof nextPositionData === 'object') {
    if (typeof nextPositionData.next_day === 'number') {
      nextDay = Math.max(1, nextPositionData.next_day);
    }
    if (typeof nextPositionData.next_order === 'number') {
      nextOrder = Math.max(0, nextPositionData.next_order);
    }
  }

  const notesData = {
    raw: '',
    cost: undefined,
    duration: undefined,
    mealType: undefined,
    image: undefined,
    city: destination.city || undefined,
    category: destination.category || undefined,
  };

  const { error: insertError } = await supabase
    .from('itinerary_items')
    .insert({
      trip_id: tripId,
      destination_slug: destination.slug,
      day: nextDay,
      order_index: nextOrder,
      title: destination.name,
      description: destination.category || '',
      notes: JSON.stringify(notesData),
    });

  if (insertError) {
    console.error('Error appending destination to trip', insertError);
    throw insertError;
  }
}
