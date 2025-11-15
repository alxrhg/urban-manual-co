import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('input') || '';
    const sessionToken = searchParams.get('sessionToken') || '';
    const location = searchParams.get('location'); // Optional: "lat,lng" for location bias
    const radius = searchParams.get('radius'); // Optional: radius in meters
    const types = searchParams.get('types') || 'establishment'; // Optional: restrict to specific types

    if (!query || query.length < 2) {
      return NextResponse.json({ predictions: [] });
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
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

    // Add included types if specified. The new Places API expects concrete primary
    // types (e.g. "restaurant", "cafe"). Older Autocomplete implementations
    // often pass placeholder values such as "establishment" or the special
    // collections "(cities)"/"(regions)" which aren't valid here and would
    // make the request fail. To keep the autocomplete usable we only forward
    // the types that look like actual primary types and ignore the legacy
    // placeholders.
    if (types && types !== 'all') {
      const normalizedTypes = types
        .split(',')
        .map((type) => type.trim())
        .filter((type) => type.length > 0);

      const allowedTypes = normalizedTypes.filter((type) => {
        if (type === 'establishment') return false;
        if (type.startsWith('(') && type.endsWith(')')) return false;
        return true;
      });

      if (allowedTypes.length > 0) {
        requestBody.includedPrimaryTypes = allowedTypes;
      }
    }

    // Add session token if provided (helps with billing)
    if (sessionToken) {
      requestBody.sessionToken = sessionToken;
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types,suggestions.placePrediction.matchedSubstrings',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

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
          matched_substrings: pred.matchedSubstrings || [],
        };
      });

    return NextResponse.json({
      predictions,
      sessionToken: data.sessionToken || sessionToken,
    });

  } catch (error: any) {
    console.error('Google Places Autocomplete error:', error);
    return NextResponse.json(
      { error: error.message || 'Autocomplete failed', predictions: [] },
      { status: 500 }
    );
  }
}

