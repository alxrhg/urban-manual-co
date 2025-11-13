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
    } catch (error) {
      console.error('Error loading homepage destinations', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export const GET = createHomepageDestinationsHandler({
  loadDestinations: () => getHomepageDestinations(),
});

export const revalidate = 60;
