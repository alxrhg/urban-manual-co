import { NextRequest, NextResponse } from 'next/server';
import {
  proxyRatelimit,
  memoryProxyRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { withErrorHandling } from '@/lib/errors';

interface DistanceRequest {
  origins: Array<{ lat: number; lng: number; name: string }>;
  destinations: Array<{ lat: number; lng: number; name: string }>;
  mode?: 'walking' | 'driving' | 'transit';
}

interface DistanceResult {
  from: string;
  to: string;
  distance: number; // meters
  duration: number; // seconds
  mode: string;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    // Apply rate limiting
    const identifier = getIdentifier(request);
    const ratelimit = isUpstashConfigured()
      ? proxyRatelimit
      : memoryProxyRatelimit;
    const { success, limit, remaining, reset } =
      await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Rate limit exceeded. Please wait before retrying.',
        limit,
        remaining,
        reset
      );
    }

    const body: DistanceRequest = await request.json();
    const { origins, destinations, mode = 'walking' } = body;

    // Validate input size to prevent abuse
    if (origins.length > 25 || destinations.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 origins and 25 destinations allowed' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['walking', 'driving', 'transit'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode must be walking, driving, or transit' },
        { status: 400 }
      );
    }

    // Use server-side API key only (never expose NEXT_PUBLIC_ key for backend calls)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('Google Maps API key not configured, using estimates');
      return NextResponse.json({
        results: calculateEstimates(origins, destinations, mode),
        source: 'estimate',
      });
    }

    // Format origins and destinations for Google API
    const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
    const destinationsStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

    // Build URL with proper encoding
    const url = new URL(
      'https://maps.googleapis.com/maps/api/distancematrix/json'
    );
    url.searchParams.set('origins', originsStr);
    url.searchParams.set('destinations', destinationsStr);
    url.searchParams.set('mode', mode);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Distance Matrix API error:', data.status);
      return NextResponse.json({
        results: calculateEstimates(origins, destinations, mode),
        source: 'estimate',
      });
    }

    // Parse results
    const results: DistanceResult[] = [];
    data.rows.forEach((row: { elements: Array<{ status: string; distance?: { value: number }; duration?: { value: number } }> }, i: number) => {
      row.elements.forEach((element, j: number) => {
        if (element.status === 'OK' && element.distance && element.duration) {
          results.push({
            from: origins[i].name,
            to: destinations[j].name,
            distance: element.distance.value,
            duration: element.duration.value,
            mode,
          });
        }
      });
    });

    return NextResponse.json({
      results,
      source: 'google',
    });
  } catch (error) {
    console.error('Distance API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distances' },
      { status: 500 }
    );
  }
});

// Fallback: Calculate estimates based on haversine distance
function calculateEstimates(
  origins: Array<{ lat: number; lng: number; name: string }>,
  destinations: Array<{ lat: number; lng: number; name: string }>,
  mode: string
): DistanceResult[] {
  const results: DistanceResult[] = [];

  origins.forEach((origin) => {
    destinations.forEach((dest) => {
      const destLat = (dest as { latitude?: number; lat: number }).latitude ?? dest.lat;
      const destLng = (dest as { longitude?: number; lng: number }).longitude ?? dest.lng;
      const distance = haversineDistance(
        origin.lat,
        origin.lng,
        destLat,
        destLng
      );

      // Estimate duration based on mode
      let speed: number; // km/h
      switch (mode) {
        case 'walking':
          speed = 5; // 5 km/h
          break;
        case 'transit':
          speed = 25; // 25 km/h average
          break;
        case 'driving':
          speed = 40; // 40 km/h in city
          break;
        default:
          speed = 5;
      }

      const duration = (distance / speed) * 3600; // seconds

      results.push({
        from: origin.name,
        to: dest.name,
        distance: distance * 1000, // convert to meters
        duration: Math.round(duration),
        mode,
      });
    });
  });

  return results;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
