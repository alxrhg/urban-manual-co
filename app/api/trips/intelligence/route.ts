import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { seasonalIntelligenceService } from '@/services/intelligence/seasonal';
import { weatherService } from '@/services/intelligence/weather';
import { narrativeService } from '@/services/intelligence/narrative';
import { createServerClient } from '@/lib/supabase/server';
import {
  stringifySeasonalIntelligence,
  stringifyWeatherForecast,
  stringifyTripNarrative,
} from '@/types/trip';

/**
 * POST /api/trips/intelligence
 * Generate and optionally save trip intelligence (seasonal, weather, narrative)
 *
 * Body:
 * - tripId?: string - If provided, saves intelligence to trip
 * - destination: string - City/destination name
 * - startDate: string - Trip start date (ISO)
 * - endDate?: string - Trip end date (ISO)
 * - tripType?: 'leisure' | 'work'
 * - items?: Array<{ title, category, day, time }> - Itinerary items for narrative
 * - tempUnit?: 'F' | 'C' - Temperature unit preference (default: F)
 * - regenerate?: boolean - Force regenerate even if data exists
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const {
    tripId,
    destination,
    startDate,
    endDate,
    tripType = 'leisure',
    items = [],
    tempUnit = 'F',
    regenerate = false,
  } = body;

  if (!destination) {
    throw createValidationError('Destination is required');
  }

  if (!startDate) {
    throw createValidationError('Start date is required');
  }

  // Generate all intelligence in parallel
  const [seasonal, weather, narrative] = await Promise.all([
    seasonalIntelligenceService.getSeasonalIntelligence(
      destination,
      startDate,
      endDate || startDate
    ),
    weatherService.getWeatherForDateRange(
      destination,
      startDate,
      endDate || startDate,
      tempUnit
    ),
    narrativeService.generateNarrative({
      destination,
      startDate,
      endDate: endDate || startDate,
      tripType,
      items,
    }),
  ]);

  // If tripId provided, save to trip
  if (tripId) {
    try {
      const supabase = await createServerClient();

      const { error } = await supabase
        .from('trips')
        .update({
          seasonal_intelligence: stringifySeasonalIntelligence(seasonal),
          weather_forecast: stringifyWeatherForecast(weather),
          narrative: stringifyTripNarrative(narrative),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (error) {
        console.error('Failed to save trip intelligence:', error);
      }
    } catch (error) {
      console.error('Error saving trip intelligence:', error);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      seasonal,
      weather: {
        ...weather,
        formatted: weatherService.formatTemperatureRange(weather),
      },
      narrative,
    },
  });
});

/**
 * GET /api/trips/intelligence
 * Get trip intelligence for a destination without saving
 *
 * Query params:
 * - destination: string (required)
 * - startDate: string (required)
 * - endDate?: string
 * - tempUnit?: 'F' | 'C'
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const destination = searchParams.get('destination');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const tempUnit = (searchParams.get('tempUnit') as 'F' | 'C') || 'F';

  if (!destination) {
    throw createValidationError('Destination is required');
  }

  if (!startDate) {
    throw createValidationError('Start date is required');
  }

  // Generate seasonal and weather only (narrative requires more context)
  const [seasonal, weather] = await Promise.all([
    seasonalIntelligenceService.getSeasonalIntelligence(
      destination,
      startDate,
      endDate || startDate
    ),
    weatherService.getWeatherForDateRange(
      destination,
      startDate,
      endDate || startDate,
      tempUnit
    ),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      seasonal,
      weather: {
        ...weather,
        formatted: weatherService.formatTemperatureRange(weather),
      },
    },
  });
});
