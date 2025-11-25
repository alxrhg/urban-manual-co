import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { categoryFromGoogleTypes, normalizeCategory, VALID_CATEGORIES } from "@/lib/categories";

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// Category to Google Places search terms mapping
const CATEGORY_SEARCH_TERMS: Record<string, string> = {
  Restaurant: "restaurants fine dining",
  Cafe: "cafes coffee shops",
  Bar: "bars cocktail lounges",
  Hotel: "boutique hotels luxury hotels",
  Culture: "museums galleries landmarks",
  Shopping: "boutiques designer stores",
  Bakery: "bakeries patisseries",
  Park: "parks gardens",
};

interface FetchParams {
  city?: string;
  cities?: string[];
  category?: string;
  limit?: number;
  minRating?: number;
}

async function fetchPlacesForCity(
  city: string,
  category: string | null,
  minRating: number = 4.0
): Promise<any[]> {
  if (!GOOGLE_KEY) {
    throw new Error("Google Places API key not configured");
  }

  const searchTerms = category && CATEGORY_SEARCH_TERMS[category]
    ? CATEGORY_SEARCH_TERMS[category]
    : "restaurants cafes hotels";

  const q = encodeURIComponent(`${searchTerms} in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${GOOGLE_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== "OK" || !json.results) {
    console.warn(`[Discovery Fetch] Google Places API error for ${city}:`, json.status);
    return [];
  }

  const candidates: any[] = [];

  for (const r of json.results) {
    // Filter by rating
    if (minRating && r.rating && r.rating < minRating) {
      continue;
    }

    // Determine category from Google types
    const googleTypes = r.types || [];
    const detectedCategory = categoryFromGoogleTypes(googleTypes) || "Other";

    // If category filter specified, only include matching
    if (category && detectedCategory !== category) {
      continue;
    }

    const photoUrl = r.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${r.photos[0].photo_reference}&key=${GOOGLE_KEY}`
      : null;

    candidates.push({
      place_id: r.place_id,
      name: r.name,
      address: r.formatted_address,
      city,
      category: detectedCategory,
      image_url: photoUrl,
      google_rating: r.rating ?? null,
      google_user_ratings_total: r.user_ratings_total ?? null,
      raw: r,
    });
  }

  return candidates;
}

/**
 * GET /api/discovery/fetch
 * Fetch new places from primary cities (legacy behavior)
 */
export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data: cities, error: citiesError } = await supabase.rpc("get_primary_cities");

    if (citiesError) {
      console.error("[Discovery Fetch] Error getting cities:", citiesError);
      return NextResponse.json({ error: citiesError.message }, { status: 500 });
    }

    if (!cities || cities.length === 0) {
      return NextResponse.json({ inserted: 0, message: "No cities found" });
    }

    if (!GOOGLE_KEY) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    const allCandidates: any[] = [];

    // Process up to 6 cities
    for (const cityRow of cities.slice(0, 6)) {
      const city = cityRow.city || cityRow;
      if (!city) continue;

      try {
        const candidates = await fetchPlacesForCity(city, null, 4.0);
        allCandidates.push(...candidates);
      } catch (error) {
        console.error(`[Discovery Fetch] Error fetching places for ${city}:`, error);
        continue;
      }
    }

    // Filter out places that already exist in destinations
    const { data: existingPlaces } = await supabase
      .from("destinations")
      .select("google_place_id")
      .not("google_place_id", "is", null);

    const existingIds = new Set((existingPlaces || []).map((p) => p.google_place_id));
    const newCandidates = allCandidates.filter((c) => !existingIds.has(c.place_id));

    // Insert ignoring duplicates
    let insertedCount = 0;
    for (const c of newCandidates) {
      const { error } = await supabase
        .from("discovery_candidates")
        .upsert(c, { onConflict: "place_id" });

      if (!error) {
        insertedCount++;
      }
    }

    return NextResponse.json({
      inserted: insertedCount,
      total: allCandidates.length,
      filtered: allCandidates.length - newCandidates.length,
      cities_processed: Math.min(cities.length, 6),
    });
  } catch (error: any) {
    console.error("[Discovery Fetch] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/discovery/fetch
 * Fetch new places with specific parameters (for n8n automation)
 *
 * Body:
 *   city?: string - Single city to fetch
 *   cities?: string[] - Multiple cities to fetch
 *   category?: string - Filter by category (Restaurant, Cafe, Bar, etc.)
 *   limit?: number - Max candidates per city (default 20)
 *   minRating?: number - Minimum Google rating (default 4.0)
 */
export async function POST(request: NextRequest) {
  try {
    const body: FetchParams = await request.json();
    const { city, cities: citiesList, category, limit = 20, minRating = 4.0 } = body;

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category as any)) {
      return NextResponse.json(
        {
          error: `Invalid category. Valid options: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Determine cities to process
    let citiesToProcess: string[] = [];
    if (city) {
      citiesToProcess = [city];
    } else if (citiesList && citiesList.length > 0) {
      citiesToProcess = citiesList;
    } else {
      // Fallback to primary cities
      const supabase = await createServerClient();
      const { data: primaryCities } = await supabase.rpc("get_primary_cities");
      citiesToProcess = (primaryCities || []).slice(0, 6).map((c: any) => c.city || c);
    }

    if (citiesToProcess.length === 0) {
      return NextResponse.json({ error: "No cities specified" }, { status: 400 });
    }

    if (!GOOGLE_KEY) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    const supabase = await createServerClient();
    const allCandidates: any[] = [];

    // Fetch places for each city
    for (const cityName of citiesToProcess) {
      try {
        const candidates = await fetchPlacesForCity(cityName, category || null, minRating);
        allCandidates.push(...candidates.slice(0, limit));
      } catch (error) {
        console.error(`[Discovery Fetch] Error fetching places for ${cityName}:`, error);
        continue;
      }
    }

    // Filter out places that already exist in destinations
    const { data: existingPlaces } = await supabase
      .from("destinations")
      .select("google_place_id")
      .not("google_place_id", "is", null);

    const existingIds = new Set((existingPlaces || []).map((p) => p.google_place_id));

    // Also filter out already-processed candidates
    const { data: existingCandidates } = await supabase
      .from("discovery_candidates")
      .select("place_id");

    const existingCandidateIds = new Set((existingCandidates || []).map((c) => c.place_id));

    const newCandidates = allCandidates.filter(
      (c) => !existingIds.has(c.place_id) && !existingCandidateIds.has(c.place_id)
    );

    // Insert new candidates
    let insertedCount = 0;
    const insertedCandidates: any[] = [];

    for (const c of newCandidates) {
      const { data, error } = await supabase
        .from("discovery_candidates")
        .upsert(c, { onConflict: "place_id" })
        .select()
        .single();

      if (!error && data) {
        insertedCount++;
        insertedCandidates.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      total_found: allCandidates.length,
      already_exists: allCandidates.length - newCandidates.length,
      cities_processed: citiesToProcess,
      category_filter: category || "all",
      candidates: insertedCandidates,
    });
  } catch (error: any) {
    console.error("[Discovery Fetch] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

