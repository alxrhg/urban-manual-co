import { NextRequest, NextResponse } from 'next/server';
import { getLocationContext } from '@/lib/search/expandLocations';

// Edge runtime for faster cold starts and lower latency
export const runtime = 'edge';
// Deploy to multiple regions: US East, US West, Tokyo
export const preferredRegion = ['iad1', 'sfo1', 'hnd1'];

/**
 * GET /api/location/context
 * Get location context (nearby locations, walking times, cultural notes)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationName = searchParams.get('location');

    if (!locationName) {
      return NextResponse.json(
        { error: 'location parameter is required' },
        { status: 400 }
      );
    }

    const context = await getLocationContext(locationName);

    if (!context) {
      return NextResponse.json({ context: null });
    }

    return NextResponse.json({ context });
  } catch (error: any) {
    console.error('Error getting location context:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

