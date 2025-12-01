import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Edge Runtime for faster cold starts (~100ms vs ~1s for Node.js)
export const runtime = 'edge';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query distinct cities from the destinations table
    const { data, error } = await supabase
      .from('destinations')
      .select('city')
      .not('city', 'is', null)
      .order('city');

    if (error) {
      console.error('Error fetching cities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cities' },
        { status: 500 }
      );
    }

    // Extract unique cities
    const cities = [...new Set(data.map((d: { city: string }) => d.city))].sort();

    // Add cache headers - city list rarely changes
    const response = NextResponse.json({ cities });
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return response;
  } catch (error) {
    console.error('Error in cities API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Enable ISR - revalidate every 5 minutes
export const revalidate = 300;
