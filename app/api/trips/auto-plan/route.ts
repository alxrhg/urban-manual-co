import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { itineraryIntelligenceService } from '@/services/intelligence/itinerary';
import { seasonalIntelligenceService } from '@/services/intelligence/seasonal';
import { weatherService } from '@/services/intelligence/weather';
import { narrativeService } from '@/services/intelligence/narrative';
import {
  stringifySeasonalIntelligence,
  stringifyWeatherForecast,
  stringifyTripNarrative,
  stringifyItineraryNotes,
  type TripType,
} from '@/types/trip';

/**
 * POST /api/trips/auto-plan
 * One-click auto-plan: creates itinerary + intelligence in a single call
 *
 * Body:
 * - tripId: string (required) - Existing trip to plan
 * - OR create new trip:
 *   - destination: string (required)
 *   - startDate: string (required)
 *   - endDate: string (required)
 *   - tripType?: 'leisure' | 'work'
 *   - arrivalAirport?: string
 * - preferences?:
 *   - categories?: string[] - Preferred categories (restaurant, museum, etc.)
 *   - budget?: 'budget' | 'moderate' | 'luxury'
 *   - style?: 'relaxed' | 'packed' | 'balanced'
 *   - mustVisit?: string[] - Destination IDs that must be included
 * - tempUnit?: 'F' | 'C'
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const {
    tripId,
    destination,
    startDate,
    endDate,
    tripType = 'leisure' as TripType,
    arrivalAirport,
    preferences = {},
    tempUnit = 'F',
  } = body;

  const supabase = createServerClient();

  // Get user from session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw createValidationError('Authentication required');
  }

  let trip;
  let tripDestination: string;
  let tripStartDate: string;
  let tripEndDate: string;

  if (tripId) {
    // Load existing trip
    const { data: existingTrip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (error || !existingTrip) {
      throw createValidationError('Trip not found');
    }

    trip = existingTrip;
    tripDestination = trip.destination || destination;
    tripStartDate = trip.start_date || startDate;
    tripEndDate = trip.end_date || endDate;

    if (!tripDestination || !tripStartDate || !tripEndDate) {
      throw createValidationError('Trip must have destination and dates for auto-planning');
    }
  } else {
    // Validate required fields for new trip
    if (!destination) {
      throw createValidationError('Destination is required');
    }
    if (!startDate || !endDate) {
      throw createValidationError('Start and end dates are required');
    }

    tripDestination = destination;
    tripStartDate = startDate;
    tripEndDate = endDate;

    // Create new trip
    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        title: `Trip to ${destination}`,
        destination,
        start_date: startDate,
        end_date: endDate,
        trip_type: tripType,
        arrival_airport: arrivalAirport,
        status: 'planning',
        is_public: false,
      })
      .select()
      .single();

    if (error || !newTrip) {
      throw createValidationError('Failed to create trip');
    }

    trip = newTrip;
  }

  // Calculate duration in days
  const start = new Date(tripStartDate);
  const end = new Date(tripEndDate);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Generate all intelligence and itinerary in parallel
  const [itinerary, seasonal, weather] = await Promise.all([
    itineraryIntelligenceService.generateItinerary(
      tripDestination,
      durationDays,
      {
        categories: preferences.categories,
        budget: preferences.budget === 'budget' ? 1 : preferences.budget === 'luxury' ? 4 : 2,
        style: preferences.style,
        mustVisit: preferences.mustVisit,
      },
      user.id
    ),
    seasonalIntelligenceService.getSeasonalIntelligence(
      tripDestination,
      tripStartDate,
      tripEndDate
    ),
    weatherService.getWeatherForDateRange(tripDestination, tripStartDate, tripEndDate, tempUnit),
  ]);

  // Convert itinerary items to database format and insert
  const itineraryItems: Array<{
    trip_id: string;
    destination_slug: string | null;
    day: number;
    order_index: number;
    time: string | null;
    title: string;
    notes: string | null;
  }> = [];

  if (itinerary?.items) {
    // Fetch destination details for the items
    const destinationIds = itinerary.items.map((item) => item.destination_id);
    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, name, slug, category, image, city, latitude, longitude')
      .in('id', destinationIds);

    const destinationMap = new Map(destinations?.map((d) => [d.id, d]) || []);

    for (const item of itinerary.items) {
      const dest = destinationMap.get(item.destination_id);
      const timeMap: Record<string, string> = {
        morning: '09:00',
        afternoon: '14:00',
        evening: '19:00',
        night: '21:00',
      };

      itineraryItems.push({
        trip_id: trip.id,
        destination_slug: dest?.slug || null,
        day: item.day || 1,
        order_index: item.order,
        time: item.time_of_day ? timeMap[item.time_of_day] : null,
        title: dest?.name || `Activity ${item.order}`,
        notes: stringifyItineraryNotes({
          type: 'place',
          category: dest?.category,
          image: dest?.image,
          city: dest?.city,
          latitude: dest?.latitude,
          longitude: dest?.longitude,
          duration: item.duration_minutes,
          travelTimeToNext: item.transit_to_next?.duration,
          travelModeToNext: item.transit_to_next?.mode as 'walking' | 'driving' | 'transit' | undefined,
        }),
      });
    }

    // Clear existing items and insert new ones
    await supabase.from('itinerary_items').delete().eq('trip_id', trip.id);

    if (itineraryItems.length > 0) {
      const { error: insertError } = await supabase.from('itinerary_items').insert(itineraryItems);

      if (insertError) {
        console.error('Failed to insert itinerary items:', insertError);
      }
    }
  }

  // Generate narrative with the new items
  const narrative = await narrativeService.generateNarrative({
    destination: tripDestination,
    startDate: tripStartDate,
    endDate: tripEndDate,
    tripType,
    items: itineraryItems.map((item) => ({
      title: item.title,
      day: item.day,
      time: item.time || undefined,
    })),
  });

  // Update trip with intelligence data
  const { error: updateError } = await supabase
    .from('trips')
    .update({
      seasonal_intelligence: stringifySeasonalIntelligence(seasonal),
      weather_forecast: stringifyWeatherForecast(weather),
      narrative: stringifyTripNarrative(narrative),
      trip_type: tripType,
      arrival_airport: arrivalAirport || trip.arrival_airport,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trip.id);

  if (updateError) {
    console.error('Failed to update trip intelligence:', updateError);
  }

  return NextResponse.json({
    success: true,
    data: {
      tripId: trip.id,
      itemsCount: itineraryItems.length,
      durationDays,
      intelligence: {
        seasonal,
        weather: {
          ...weather,
          formatted: weatherService.formatTemperatureRange(weather),
        },
        narrative,
      },
    },
  });
});
