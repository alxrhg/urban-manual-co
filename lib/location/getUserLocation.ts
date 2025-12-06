/**
 * User Location Detection
 *
 * Uses Vercel Edge geolocation headers for fast, free, and accurate
 * location detection. Falls back to IP lookup services if headers
 * are not available (e.g., in development).
 *
 * Vercel automatically provides these headers for all Edge and Serverless functions:
 * - x-vercel-ip-city
 * - x-vercel-ip-country
 * - x-vercel-ip-country-region
 * - x-vercel-ip-latitude
 * - x-vercel-ip-longitude
 * - x-vercel-ip-timezone
 *
 * @see https://vercel.com/docs/edge-network/headers#x-vercel-ip-city
 */

export interface UserLocation {
  city: string;
  country: string;
  region?: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

// Simple in-memory cache for fallback lookups (1 hour TTL)
const locationCache = new Map<string, { location: UserLocation; expires: number }>();
const CACHE_TTL = 3600_000; // 1 hour

/**
 * Get user location from request headers
 *
 * Prioritizes Vercel Edge headers (free, fast, no API calls)
 * Falls back to IP lookup services for development/non-Vercel environments
 */
export async function getUserLocation(request: Request): Promise<UserLocation | null> {
  try {
    // Try Vercel Edge geolocation headers first (preferred)
    const vercelLocation = getVercelGeoLocation(request);
    if (vercelLocation) {
      return vercelLocation;
    }

    // Fallback to IP-based lookup for development or non-Vercel environments
    return await getLocationFromIP(request);
  } catch (error) {
    console.error('getUserLocation error:', error);
    return null;
  }
}

/**
 * Extract location from Vercel Edge geolocation headers
 * These headers are automatically provided by Vercel's Edge Network
 */
function getVercelGeoLocation(request: Request): UserLocation | null {
  const city = request.headers.get('x-vercel-ip-city');
  const country = request.headers.get('x-vercel-ip-country');
  const region = request.headers.get('x-vercel-ip-country-region');
  const latitude = request.headers.get('x-vercel-ip-latitude');
  const longitude = request.headers.get('x-vercel-ip-longitude');
  const timezone = request.headers.get('x-vercel-ip-timezone');

  // Check if we have the essential headers
  if (!city && !country) {
    return null;
  }

  // Decode URL-encoded city names (e.g., "S%C3%A3o%20Paulo" -> "São Paulo")
  const decodedCity = city ? decodeURIComponent(city) : 'Unknown';

  return {
    city: decodedCity,
    country: country || 'Unknown',
    region: region || undefined,
    timezone: timezone || 'UTC',
    latitude: latitude ? parseFloat(latitude) : 0,
    longitude: longitude ? parseFloat(longitude) : 0,
  };
}

/**
 * Fallback: Get location from IP address using external services
 * Used in development or when Vercel headers are not available
 */
async function getLocationFromIP(request: Request): Promise<UserLocation | null> {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const ip = (forwardedFor.split(',')[0] || request.headers.get('x-real-ip') || '').trim();

  // Skip if no IP (local/dev with no forwarded headers)
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return null;
  }

  // Check cache first
  const cached = locationCache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return cached.location;
  }

  let location: UserLocation | null = null;

  // Try ipinfo.io if token is available (more reliable)
  const token = process.env.IPINFO_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://ipinfo.io/${ip}/json?token=${token}`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (res.ok) {
        const data = await res.json();
        const [latStr, lonStr] = String(data.loc || '').split(',');
        location = {
          city: data.city || 'Unknown',
          country: data.country || 'Unknown',
          region: data.region,
          timezone: data.timezone || 'UTC',
          latitude: parseFloat(latStr || '0'),
          longitude: parseFloat(lonStr || '0'),
        };
      }
    } catch (error) {
      console.warn('ipinfo.io lookup failed:', error);
    }
  }

  // Fallback to free ipapi.co (rate limited, less reliable)
  if (!location) {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          location = {
            city: data.city || 'Unknown',
            country: data.country_name || data.country || 'Unknown',
            region: data.region,
            timezone: data.timezone || 'UTC',
            latitude: Number(data.latitude) || 0,
            longitude: Number(data.longitude) || 0,
          };
        }
      }
    } catch (error) {
      console.warn('ipapi.co lookup failed:', error);
    }
  }

  // Cache the result
  if (location) {
    locationCache.set(ip, { location, expires: Date.now() + CACHE_TTL });

    // Cleanup old entries (simple LRU-like behavior)
    if (locationCache.size > 1000) {
      const oldestKey = locationCache.keys().next().value;
      if (oldestKey) locationCache.delete(oldestKey);
    }
  }

  return location;
}

/**
 * Check if running on Vercel (has Edge geolocation available)
 */
export function hasVercelGeolocation(request: Request): boolean {
  return !!(
    request.headers.get('x-vercel-ip-city') ||
    request.headers.get('x-vercel-ip-country')
  );
}
