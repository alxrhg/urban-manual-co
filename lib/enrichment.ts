/**
 * Destination Enrichment Service
 * Uses Google Places API (New) + Gemini AI to enrich destination data
 */

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export interface PlacesEnrichmentData {
  place_id: string | null;
  rating: number | null;
  price_level: number | null;
  opening_hours: any | null;
  current_opening_hours: any | null;
  phone_number: string | null;
  website: string | null;
  google_maps_url: string | null;
  google_types: string[];
  formatted_address: string | null;
  editorial_summary: string | null;
  reviews_json: any[];
}

export interface GeminiTagsData {
  tags: string[];
  suggested_category: string | null;
}

export interface EnrichedData {
  places: PlacesEnrichmentData;
  gemini: GeminiTagsData;
  category: string; // Final category decision
}

/**
 * Step 1: Search for place using Places API (New) - Text Search
 */
export async function findPlaceByText(
  name: string,
  city: string
): Promise<PlacesEnrichmentData> {
  if (!GOOGLE_API_KEY) {
    console.error('❌ NEXT_PUBLIC_GOOGLE_API_KEY is not configured in environment variables');
    throw new Error('Google API key not configured');
  }

  try {
    // Use Places API (New) - Text Search
    const searchQuery = `${name}, ${city}`;
    console.log(`📍 Searching Google Places for: "${searchQuery}"`);

    const response = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.types',
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          maxResultCount: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Places API error ${response.status}:`, errorText);
      throw new Error(`Places API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      console.warn(`⚠️  No place found for: "${searchQuery}"`);
      return {
        place_id: null,
        rating: null,
        price_level: null,
        opening_hours: null,
        current_opening_hours: null,
        phone_number: null,
        website: null,
        google_maps_url: null,
        google_types: [],
        formatted_address: null,
        editorial_summary: null,
        reviews_json: [],
      };
    }

    const place = data.places[0];
    console.log(`✅ Found place: ${place.displayName?.text || name} (${place.id})`);
    console.log(`   Rating: ${place.rating || 'N/A'}, Types: ${(place.types || []).join(', ')}`);


    // Convert price level from Google's format to 1-4
    const priceLevelMap: Record<string, number> = {
      'PRICE_LEVEL_FREE': 1,
      'PRICE_LEVEL_INEXPENSIVE': 1,
      'PRICE_LEVEL_MODERATE': 2,
      'PRICE_LEVEL_EXPENSIVE': 3,
      'PRICE_LEVEL_VERY_EXPENSIVE': 4,
    };

    // Fetch details to get address, editorial summary, reviews
    let formatted_address: string | null = null;
    let editorial_summary: string | null = null;
    let reviews_json: any[] = [];
    try {
      if (place.id) {
        const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${place.id}` , {
          headers: {
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'formattedAddress,editorialSummary,reviews',
          }
        });
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          formatted_address = details.formattedAddress || null;
          editorial_summary = details.editorialSummary?.text || null;
          reviews_json = Array.isArray(details.reviews) ? details.reviews : [];
        }
      }
    } catch {}

    return {
      place_id: place.id || null,
      rating: place.rating || null,
      price_level: place.priceLevel ? priceLevelMap[place.priceLevel] || null : null,
      opening_hours: place.regularOpeningHours || null,
      current_opening_hours: place.currentOpeningHours || null,
      phone_number: place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      google_maps_url: place.googleMapsUri || null,
      google_types: place.types || [],
      formatted_address,
      editorial_summary,
      reviews_json,
    };
  } catch (error) {
    console.error('Places API error:', error);
    return {
      place_id: null,
      rating: null,
      price_level: null,
      opening_hours: null,
      current_opening_hours: null,
      phone_number: null,
      website: null,
      google_maps_url: null,
      google_types: [],
      formatted_address: null,
      editorial_summary: null,
      reviews_json: [],
    };
  }
}

/**
 * Step 2: Generate AI tags and category using Gemini
 */
export async function generateGeminiTags(
  name: string,
  city: string,
  existingCategory?: string,
  description?: string,
  googleTypes?: string[]
): Promise<GeminiTagsData> {
  if (!GOOGLE_API_KEY) {
    console.error('❌ NEXT_PUBLIC_GOOGLE_API_KEY is not configured in environment variables');
    throw new Error('Google API key not configured');
  }

  try {
    console.log(`🤖 Generating AI tags for: ${name}`);

    const prompt = `You are a travel expert categorizing destinations. Analyze this place and provide:
1. 5-8 descriptive tags (e.g., "romantic", "family-friendly", "instagrammable", "hidden gem", "michelin-recommended", "rooftop", "speakeasy", etc.)
2. Best category classification

Place: ${name}
Location: ${city}
${existingCategory ? `Current category: ${existingCategory}` : ''}
${description ? `Description: ${description}` : ''}
${googleTypes?.length ? `Google types: ${googleTypes.join(', ')}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggested_category": "Category Name"
}

Tags should be lowercase, concise, and highly searchable. Categories should be one of: Restaurants, Cafes, Bars, Hotels, Culture, Shopping, Nightlife, Activities, Other.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error ${response.status}:`, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (Gemini sometimes adds markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No valid JSON in Gemini response:', text);
      throw new Error('No valid JSON in Gemini response');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log(`✅ Generated ${result.tags?.length || 0} tags: ${(result.tags || []).join(', ')}`);
    console.log(`   Suggested category: ${result.suggested_category || 'None'}`);

    return {
      tags: result.tags || [],
      suggested_category: result.suggested_category || null,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      tags: [],
      suggested_category: null,
    };
  }
}

/**
 * Step 3: Determine best category from Google types
 */
function categorizePlaceFromTypes(googleTypes: string[]): string | null {
  const typeMap: Record<string, string> = {
    restaurant: 'Restaurants',
    hot_pot_restaurant: 'Restaurants',
    shabu_shabu_restaurant: 'Restaurants',
    cafe: 'Cafes',
    bar: 'Bars',
    night_club: 'Nightlife',
    lodging: 'Hotels',
    museum: 'Culture',
    art_gallery: 'Culture',
    shopping_mall: 'Shopping',
    store: 'Shopping',
    tourist_attraction: 'Activities',
    park: 'Activities',
  };

  for (const type of googleTypes) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  return null;
}

/**
 * Main enrichment function - combines Places API + Gemini
 */
export async function enrichDestination(
  name: string,
  city: string,
  existingCategory?: string,
  description?: string
): Promise<EnrichedData> {
  console.log(`\n🚀 Starting enrichment for: ${name} in ${city}`);
  console.log(`   Existing category: ${existingCategory || 'None'}`);

  // Step 1: Get Google Places data
  const placesData = await findPlaceByText(name, city);

  // Step 2: Generate Gemini tags
  const geminiData = await generateGeminiTags(
    name,
    city,
    existingCategory,
    description,
    placesData.google_types
  );

  // Step 3: Determine final category
  let finalCategory = existingCategory || '';

  // Priority: Google types > Gemini suggestion > existing
  if (placesData.google_types.length > 0) {
    const googleCategory = categorizePlaceFromTypes(placesData.google_types);
    if (googleCategory) {
      console.log(`📂 Category from Google types: ${googleCategory}`);
      finalCategory = googleCategory;
    }
  } else if (geminiData.suggested_category) {
    console.log(`📂 Category from Gemini: ${geminiData.suggested_category}`);
    finalCategory = geminiData.suggested_category;
  } else {
    console.log(`📂 Keeping existing category: ${finalCategory}`);
  }

  console.log(`✨ Enrichment complete for ${name}`);
  console.log(`   Place ID: ${placesData.place_id || 'Not found'}`);
  console.log(`   Rating: ${placesData.rating || 'N/A'}`);
  console.log(`   Tags: ${geminiData.tags.length} tags generated`);
  console.log(`   Final category: ${finalCategory}\n`);

  return {
    places: placesData,
    gemini: geminiData,
    category: finalCategory,
  };
}
