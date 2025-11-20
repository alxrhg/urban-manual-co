import { NextRequest, NextResponse } from 'next/server';
import type { Destination } from '@/types/destination';
import { getHomepageDestinations } from '@/server/services/homepage-loaders';

type DestinationsHandlerDeps = {
  loadDestinations: (limit?: number) => Promise<Destination[]>;
};

export function createHomepageDestinationsHandler(deps: DestinationsHandlerDeps) {
  return async function handler(request: NextRequest) {
    try {
      // Allow limit to be specified via query parameter, default to 5000
      const searchParams = request.nextUrl.searchParams;
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 5000;
      const destinations = await deps.loadDestinations(limit);
      return NextResponse.json({ success: true, destinations });
    } catch (error: any) {
      console.error('[Homepage Destinations API] Error loading destinations:', error?.message || error);
      
      // Check if it's a Supabase config error or connection issue
      if (error?.message?.includes('placeholder') || 
          error?.message?.includes('invalid') ||
          error?.message?.includes('Failed to create service role client') ||
          error?.message?.includes('fetch failed') ||
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

// Disable caching completely to ensure new POIs show up immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;
