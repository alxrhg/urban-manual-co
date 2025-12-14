import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  createValidationError,
  createSuccessResponse,
} from '@/lib/errors';
import {
  proxyRatelimit,
  memoryProxyRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting for external API proxy
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many autocomplete requests. Please try again later.',
    limiter: proxyRatelimit,
    memoryLimiter: memoryProxyRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('input') || '';
  const sessionToken = searchParams.get('sessionToken') || '';
  const location = searchParams.get('location'); // Optional: "lat,lng" for location bias
  const radius = searchParams.get('radius'); // Optional: radius in meters
  const types = searchParams.get('types') || 'establishment'; // Optional: restrict to specific types

  if (!query || query.length < 2) {
    return createSuccessResponse({ predictions: [], sessionToken });
  }

  if (!GOOGLE_API_KEY) {
    throw createValidationError('Google API key not configured');
  }

    // Use Places API (New) - Autocomplete
    const requestBody: any = {
      input: query,
      languageCode: 'en',
    };

    // Add location bias if provided
    if (location) {
      const [lat, lng] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        requestBody.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius ? parseFloat(radius.toString()) : 2000.0, // Default 2km
          },
        };
      }
    }

    // Add included types if specified
    // Note: Places API (New) uses specific type names, not 'establishment'
    // For broad searches, we skip this parameter entirely
    if (types && types !== 'all' && types !== 'establishment') {
      // Map common types to Places API (New) format
      const typeMap: Record<string, string[]> = {
        'restaurant': ['restaurant'],
        'cafe': ['cafe'],
        'bar': ['bar'],
        'hotel': ['lodging', 'hotel'],
        'museum': ['museum'],
        'shopping': ['shopping_mall', 'store'],
        'attraction': ['tourist_attraction'],
      };
      if (typeMap[types]) {
        requestBody.includedPrimaryTypes = typeMap[types];
      }
    }

    // Add session token if provided (helps with billing)
    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    console.log('[Google Places Autocomplete] Request:', { query, types, location });

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Places Autocomplete] API Error:', response.status, errorText);
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Google Places Autocomplete] Response predictions:', data.suggestions?.length || 0);

    // Transform Google's response to our format
    const predictions = (data.suggestions || [])
      .filter((suggestion: any) => suggestion.placePrediction) // Only include place predictions
      .map((suggestion: any) => {
        const pred = suggestion.placePrediction;
        return {
          place_id: pred.placeId,
          description: pred.text?.text || '',
          structured_formatting: pred.structuredFormat || {},
          main_text: pred.structuredFormat?.mainText?.text || pred.text?.text?.split(',')?.[0] || '',
          secondary_text: pred.structuredFormat?.secondaryText?.text || pred.text?.text?.split(',').slice(1).join(',') || '',
          types: pred.types || [],
        };
      });

  return createSuccessResponse({
    predictions,
    sessionToken: data.sessionToken || sessionToken,
  });
})

