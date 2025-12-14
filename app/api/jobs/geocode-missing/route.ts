/**
 * Geocode Missing Destinations Job
 *
 * POST /api/jobs/geocode-missing
 *
 * Admin endpoint to geocode destinations missing coordinates.
 */

import { NextRequest } from 'next/server';
import { withAdminAuth, createSuccessResponse, AdminContext } from '@/lib/errors';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

async function geocodeWithGoogle(name: string, city: string) {
  const query = `${name}, ${city}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.status === 'OK' && data.results && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      long: location.lng,
      formatted_address: data.results[0].formatted_address,
      place_id: data.results[0].place_id,
    };
  }

  return null;
}

export const POST = withAdminAuth(async (request: NextRequest, { serviceClient }: AdminContext) => {
  const body = await request.json();
  const { batchSize = 20, dryRun = false } = body;

  if (!GOOGLE_API_KEY) {
    throw new Error('NEXT_PUBLIC_GOOGLE_API_KEY not configured');
  }

  // Fetch destinations without coordinates
  const { data: destinations, error } = await serviceClient
    .from('destinations')
    .select('id, name, city, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .limit(batchSize);

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to fetch destinations');
  }

  if (!destinations || destinations.length === 0) {
    return createSuccessResponse({
      message: 'No destinations need geocoding',
      processed: 0,
    });
  }

  const results = {
    total: destinations.length,
    processed: 0,
    errors: [] as string[],
    updated: [] as number[],
  };

  // Process each destination
  for (const dest of destinations) {
    try {
      console.log(`Geocoding: ${dest.name} in ${dest.city}`);
      const result = await geocodeWithGoogle(dest.name, dest.city);

      if (result && result.lat !== 0 && result.long !== 0) {
        if (!dryRun) {
          // Update the destination
          const { error: updateError } = await serviceClient
            .from('destinations')
            .update({
              latitude: result.lat,
              longitude: result.long,
              google_place_id: result.place_id,
            })
            .eq('id', dest.id);

          if (updateError) {
            throw updateError;
          }
        }

        results.updated.push(dest.id);
        results.processed++;
        console.log(`✓ Updated: ${dest.name} (${result.lat}, ${result.long})`);
      } else {
        results.errors.push(`No results found for: ${dest.name}, ${dest.city}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`Error processing destination ${dest.id}:`, err);
      results.errors.push(`Destination ${dest.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return createSuccessResponse({
    message: dryRun ? 'Dry run complete' : 'Geocoding complete',
    ...results,
  });
});
