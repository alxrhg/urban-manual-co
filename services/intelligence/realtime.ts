/**
 * Real-Time Intelligence Service
 * Weather adjustments, crowding intelligence, event integration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface RealtimeAdjustment {
  type: 'weather' | 'crowding' | 'event' | 'availability';
  message: string;
  affected_destinations: number[];
  suggested_alternatives?: any[];
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Generate real-time adjustments for itinerary
 */
export async function generateRealTimeAdjustments(
  destinationIds: number[],
  dates: { start: Date; end: Date }
): Promise<RealtimeAdjustment[]> {
  const adjustments: RealtimeAdjustment[] = [];

  // Weather adjustments
  const weatherAdjustments = await checkWeatherAdjustments(destinationIds, dates);
  adjustments.push(...weatherAdjustments);

  // Crowding intelligence
  const crowdingAdjustments = await checkCrowdingIntelligence(destinationIds, dates);
  adjustments.push(...crowdingAdjustments);

  // Event integration
  const eventAdjustments = await checkEvents(destinationIds, dates);
  adjustments.push(...eventAdjustments);

  return adjustments;
}

/**
 * Check weather and suggest indoor alternatives
 */
async function checkWeatherAdjustments(
  destinationIds: number[],
  dates: { start: Date; end: Date }
): Promise<RealtimeAdjustment[]> {
  const adjustments: RealtimeAdjustment[] = [];

  // Fetch weather data for destinations
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, name, current_weather_json, weather_forecast_json')
    .in('id', destinationIds);

  if (!destinations) return adjustments;

  for (const dest of destinations) {
    const forecast = dest.weather_forecast_json as any;
    if (!forecast || !Array.isArray(forecast)) continue;

    // Check if rain is forecasted
    const hasRain = forecast.some((day: any) => 
      day.weatherCode && [61, 63, 65, 66, 67, 80, 81, 82].includes(day.weatherCode)
    );

    if (hasRain) {
      adjustments.push({
        type: 'weather',
        message: `Rain forecasted for ${dest.name}. Consider indoor architectural destinations.`,
        affected_destinations: [dest.id],
        severity: 'info',
      });
    }
  }

  return adjustments;
}

/**
 * Check crowding levels
 */
async function checkCrowdingIntelligence(
  destinationIds: number[],
  dates: { start: Date; end: Date }
): Promise<RealtimeAdjustment[]> {
  const adjustments: RealtimeAdjustment[] = [];

  // This would integrate with Google Places Popular Times or similar
  // For now, return empty - would need actual crowding data source

  return adjustments;
}

/**
 * Check for events during trip dates
 */
async function checkEvents(
  destinationIds: number[],
  dates: { start: Date; end: Date }
): Promise<RealtimeAdjustment[]> {
  const adjustments: RealtimeAdjustment[] = [];

  // Fetch events for destinations
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, name, nearby_events_json')
    .in('id', destinationIds);

  if (!destinations) return adjustments;

  for (const dest of destinations) {
    const events = dest.nearby_events_json as any;
    if (!events || !Array.isArray(events)) continue;

    const upcomingEvents = events.filter((event: any) => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate >= dates.start && eventDate <= dates.end;
    });

    if (upcomingEvents.length > 0) {
      adjustments.push({
        type: 'event',
        message: `${upcomingEvents.length} event(s) happening near ${dest.name} during your trip.`,
        affected_destinations: [dest.id],
        severity: 'info',
      });
    }
  }

  return adjustments;
}

