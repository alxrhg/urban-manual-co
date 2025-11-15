import { NextRequest, NextResponse } from 'next/server';
import type { Destination } from '@/types/destination';
import { getHomepageDestinations } from '@/server/services/homepage-loaders';

type DestinationsHandlerDeps = {
  loadDestinations: () => Promise<Destination[]>;
};

export function createHomepageDestinationsHandler(deps: DestinationsHandlerDeps) {
  return async function handler(_request: NextRequest) {
    try {
      const destinations = await deps.loadDestinations();
      return NextResponse.json({ success: true, destinations });
    } catch (error: any) {
      console.error('[Homepage Destinations API] Error loading destinations:', error?.message || error);
      
      // Check if it's a Supabase config error or connection issue
      if (error?.message?.includes('placeholder') || 
          error?.message?.includes('invalid') ||
          error?.message?.includes('Failed to create service role client') ||
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ETIMEDOUT') {
        console.warn('[Homepage Destinations API] Database connection issue - returning empty destinations');
        return NextResponse.json({ success: true, destinations: [], note: 'Database temporarily unavailable' }, { status: 200 });
      }
      
      // For other errors, also return empty destinations with 200 for better UX
      // The frontend can still render the page, just without destinations
      console.error('[Homepage Destinations API] Unexpected error - returning empty destinations for graceful degradation');
      return NextResponse.json({ success: true, destinations: [], error: 'Unable to load destinations' }, { status: 200 });
    }
  };
}

export const GET = createHomepageDestinationsHandler({
  loadDestinations: () => getHomepageDestinations(),
});

// Reduced revalidate time to allow faster updates after POI creation
export const revalidate = 10;
