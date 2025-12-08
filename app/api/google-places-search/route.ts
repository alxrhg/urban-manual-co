import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Optional: require authentication if needed, but for now allow logged-in users
    // await requireAdmin(request); 

    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API Key not configured' }, { status: 500 });
    }

    // Use Places API (New) - Text Search
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.priceLevel',
          'places.types',
          'places.photos',
          'places.primaryTypeDisplayName',
          'places.websiteUri',
          'places.internationalPhoneNumber'
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 10,
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places Search API error: ${response.status}`, errorText);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform results
    const places = (data.places || []).map((place: any) => {
      let imageUrl = null;
      if (place.photos && place.photos.length > 0) {
        const photo = place.photos[0];
        if (photo.name) {
          imageUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=500&key=${GOOGLE_API_KEY}`;
        }
      }

      // Determine category
      let category = 'Other';
      if (place.types && place.types.length > 0) {
         const categoryMap: Record<string, string> = {
          'restaurant': 'Dining',
          'cafe': 'Cafe',
          'bar': 'Bar',
          'lodging': 'Hotel',
          'museum': 'Culture',
          'art_gallery': 'Culture',
          'shopping_mall': 'Shopping',
          'store': 'Shopping',
          'park': 'Culture',
          'tourist_attraction': 'Culture',
          'church': 'Culture',
          'temple': 'Culture',
        };
        
        for (const type of place.types) {
          if (categoryMap[type]) {
            category = categoryMap[type];
            break;
          }
        }
      }

      return {
        id: place.id,
        name: place.displayName?.text || '',
        formatted_address: place.formattedAddress || '',
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        price_level: place.priceLevel ? priceLevelToNumber(place.priceLevel) : null,
        category,
        types: place.types || [],
        image: imageUrl,
        website: place.websiteUri,
        phone: place.internationalPhoneNumber,
      };
    });

    return NextResponse.json({ places });

  } catch (error: any) {
    console.error('Google Places Search error:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}

function priceLevelToNumber(priceLevel: string): number | null {
  const mapping: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return mapping[priceLevel] ?? null;
}


