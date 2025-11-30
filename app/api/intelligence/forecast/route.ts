import { NextRequest, NextResponse } from 'next/server';
import { forecastingService } from '@/services/intelligence/forecasting';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const destinationId = searchParams.get('destination_id');
  const days = parseInt(searchParams.get('days') || '30');
  const metric = searchParams.get('metric') as 'demand' | 'price' | null;

  if (!city && !destinationId) {
    throw createValidationError('city or destination_id is required');
  }

  let forecast;

  if (metric === 'price' && destinationId) {
    forecast = await forecastingService.forecastPrice(destinationId, days);
  } else {
    forecast = await forecastingService.forecastDemand(city || undefined, destinationId || undefined, days);
  }

  if (!forecast) {
    throw createValidationError('Forecast not available. Insufficient historical data.');
  }

  return NextResponse.json(forecast);
});

