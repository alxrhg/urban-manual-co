import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '5'); // km
    const limit = parseInt(searchParams.get('limit') || '50');
    const city = searchParams.get('city'); // Optional city filter
    const category = searchParams.get('category'); // Optional category filter

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Call database function
    const { data: destinations, error } = await supabase
      .rpc('destinations_nearby', {
        user_lat: lat,
        user_lng: lng,
        radius_km: radius,
        result_limit: limit
      });

    if (error) {
      console.error('Error fetching nearby destinations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch nearby destinations', details: error.message },
        { status: 500 }
      );
    }

    // Apply additional filters if provided
    let filtered = destinations || [];

    if (city) {
      filtered = filtered.filter((d: any) => d.city === city);
    }

    if (category) {
      filtered = filtered.filter((d: any) => d.category === category);
    }

    return NextResponse.json({
      destinations: filtered,
      userLocation: { lat, lng },
      radius,
      count: filtered.length,
    });
  } catch (error: any) {
    console.error('Error in nearby API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
