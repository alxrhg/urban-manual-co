import { NextRequest, NextResponse } from 'next/server';
import { resolveSupabaseClient } from '@/app/api/_utils/supabase';

interface NearbyDestination {
  slug: string;
  name: string;
  city: string | null;
  category: string | null;
  description?: string | null;
  content?: string | null;
  image?: string | null;
  michelin_stars?: number | null;
  crown?: boolean | null;
  latitude: number | string | null;
  longitude: number | string | null;
  distance_km?: number;
  distance_miles?: number;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = resolveSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase credentials are not configured.' },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const lat = latParam !== null ? Number(latParam) : NaN;
    const lng = lngParam !== null ? Number(lngParam) : NaN;
    const radiusParam = searchParams.get('radius');
    const limitParam = searchParams.get('limit');
    const radiusValue = radiusParam !== null ? Number(radiusParam) : 5; // km
    const limitValue = limitParam !== null ? Number.parseInt(limitParam, 10) : 50;
    const radius = Number.isFinite(radiusValue) && radiusValue > 0 ? radiusValue : 5;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 50;
    const city = searchParams.get('city'); // Optional city filter
    const category = searchParams.get('category'); // Optional category filter

    const hasValidCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

    if (!hasValidCoordinates) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Try using the database function first (if migration has been run)
    let destinations: NearbyDestination[] = [];
    let usesFallback = false;

    try {
      const { data, error } = await supabase
        .rpc<NearbyDestination[]>('destinations_nearby', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radius,
          result_limit: limit
        });

      if (error) {
        // Function doesn't exist, use fallback
        console.log('Database function not found, using fallback method');
        usesFallback = true;
      } else {
        destinations = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      // Function doesn't exist, use fallback
      console.log('Database function error, using fallback method', error);
      usesFallback = true;
    }

    // Fallback: Fetch all destinations and calculate distance client-side
    if (usesFallback) {
      const { data, error } = await supabase
        .from<NearbyDestination>('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown, latitude, longitude');

      if (error) {
        console.error('Error fetching destinations:', error);
        return NextResponse.json(
          { error: 'Failed to fetch destinations', details: error.message },
          { status: 500 }
        );
      }

      // Calculate distances for destinations that have coordinates
      const withDistances = (data || []).reduce<NearbyDestination[]>((acc, record) => {
        const destinationLat = Number(record.latitude);
        const destinationLng = Number(record.longitude);
        if (!Number.isFinite(destinationLat) || !Number.isFinite(destinationLng)) {
          return acc;
        }

        const distance = calculateDistance(lat, lng, destinationLat, destinationLng);
        if (distance > radius) {
          return acc;
        }

        acc.push({
          ...record,
          distance_km: distance,
          distance_miles: distance * 0.621371,
        });
        return acc;
      }, []);

      destinations = withDistances
        .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
        .slice(0, limit);
    }

    // Apply additional filters if provided
    let filtered: NearbyDestination[] = destinations || [];

    if (city) {
      filtered = filtered.filter((d) => d.city === city);
    }

    if (category) {
      filtered = filtered.filter((d) => d.category === category);
    }

    return NextResponse.json({
      destinations: filtered,
      userLocation: { lat, lng },
      radius,
      count: filtered.length,
      usesFallback,
    });
  } catch (error: unknown) {
    console.error('Error in nearby API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
