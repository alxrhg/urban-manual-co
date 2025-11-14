/**
 * Geocode Missing Destinations Job
 * 
 * POST /api/jobs/geocode-missing
 * 
 * QStash-compatible endpoint to geocode destinations missing coordinates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireQStashSignature } from '@/lib/qstash-middleware';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

async function geocodeWithGoogle(name: string, city: string) {
  const query = `${name}, ${city}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  try {
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
  } catch (error) {
    console.error(`Error geocoding ${query}:`, error);
    throw error;
  }
}

async function handleGeocodeJob(request: NextRequest, body: any) {
  try {
    const { batchSize = 20, dryRun = false } = body;

    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch destinations without coordinates
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, name, city, latitude, longitude')
      .or('latitude.is.null,longitude.is.null')
      .limit(batchSize);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch destinations' },
        { status: 500 }
      );
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({
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
            const { error: updateError } = await supabase
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

    return NextResponse.json({
      message: dryRun ? 'Dry run complete' : 'Geocoding complete',
      ...results,
    });

  } catch (error) {
    console.error('Geocode job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check if QStash signature verification is enabled
  const qstashEnabled = process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY;

  if (qstashEnabled) {
    return requireQStashSignature(request, handleGeocodeJob);
  } else {
    // For local testing, allow without signature
    const body = await request.json();
    return handleGeocodeJob(request, body);
  }
}
