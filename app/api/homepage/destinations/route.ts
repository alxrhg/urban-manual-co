import { NextRequest, NextResponse } from 'next/server';
import type { Destination } from '@/types/destination';
import { getHomepageDestinations } from '@/server/services/homepage-loaders';

type DestinationsQuery = {
  limit?: number;
  offset?: number;
};

type DestinationsHandlerDeps = {
  loadDestinations: (options?: DestinationsQuery) => Promise<Destination[]>;
};

export function createHomepageDestinationsHandler(deps: DestinationsHandlerDeps) {
  return async function handler(request: NextRequest) {
    try {
      const { searchParams } = request.nextUrl;
      const limitParam = searchParams.get('limit');
      const offsetParam = searchParams.get('offset');
      const limit = limitParam ? Number(limitParam) : undefined;
      const offset = offsetParam ? Number(offsetParam) : undefined;
      const destinations = await deps.loadDestinations({ limit, offset });
      return NextResponse.json({ success: true, destinations });
    } catch (error) {
      console.error('Error loading homepage destinations', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export const GET = createHomepageDestinationsHandler({
  loadDestinations: ({ limit, offset } = {}) => getHomepageDestinations(limit, offset),
});

export const revalidate = 60;
