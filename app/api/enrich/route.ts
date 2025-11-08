import { NextRequest, NextResponse } from 'next/server';
import { enrichDestination } from '@/lib/enrichment';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

/**
 * POST /api/enrich
 *
 * Enriches a single destination with Google Places API + Gemini AI
 *
 * Body: {
 *   slug: string,
 *   name: string,
 *   city: string,
 *   category?: string,
 *   content?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { serviceClient: supabase } = await requireAdmin(request);

    const { slug, name, city, category, content } = await request.json();

    if (!slug || !name || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name, city' },
        { status: 400 }
      );
    }

    console.log(`Enriching: ${name} in ${city}`);

    // Enrich with Places API + Gemini
    const enriched = await enrichDestination(name, city, category, content);

    // Check if destination has Michelin stars - if so, ensure category is 'Dining'
    // First, get current michelin_stars value
    const { data: currentDestination } = await supabase
      .from('destinations')
      .select('michelin_stars')
      .eq('slug', slug)
      .single();

    // Determine final category - if michelin_stars > 0, must be 'Dining'
    let finalCategory = enriched.category;
    if (currentDestination?.michelin_stars && currentDestination.michelin_stars > 0) {
      finalCategory = 'Dining';
    }

    // Build comprehensive update object with all available fields
    const updateData: any = {
      place_id: enriched.places.place_id,
      rating: enriched.places.rating,
      price_level: enriched.places.price_level,
      opening_hours: enriched.places.opening_hours,
      phone_number: enriched.places.phone_number || enriched.places.international_phone_number,
      website: enriched.places.website,
      google_maps_url: enriched.places.google_maps_url,
      tags: enriched.gemini.tags,
      category: finalCategory,
      cuisine_type: enriched.places.cuisine_type,
      last_enriched_at: new Date().toISOString(),
    };

    // Add additional fields if available
    if (enriched.places.formatted_address) {
      updateData.formatted_address = enriched.places.formatted_address;
    }
    if (enriched.places.international_phone_number) {
      updateData.international_phone_number = enriched.places.international_phone_number;
    }
    if (enriched.places.latitude !== null && enriched.places.longitude !== null) {
      updateData.latitude = enriched.places.latitude;
      updateData.longitude = enriched.places.longitude;
    }
    if (enriched.places.user_ratings_total !== null) {
      updateData.user_ratings_total = enriched.places.user_ratings_total;
    }
    if (enriched.places.reviews) {
      updateData.reviews_json = JSON.stringify(enriched.places.reviews);
    }
    if (enriched.places.business_status) {
      updateData.business_status = enriched.places.business_status;
    }
    if (enriched.places.editorial_summary) {
      updateData.editorial_summary = enriched.places.editorial_summary;
    }
    if (enriched.places.plus_code) {
      updateData.plus_code = enriched.places.plus_code;
    }
    if (enriched.places.timezone_id) {
      updateData.timezone_id = enriched.places.timezone_id;
    }
    if (enriched.places.vicinity) {
      updateData.vicinity = enriched.places.vicinity;
    }
    if (enriched.places.address_components) {
      updateData.address_components_json = JSON.stringify(enriched.places.address_components);
    }
    if (enriched.places.opening_hours) {
      updateData.opening_hours_json = JSON.stringify(enriched.places.opening_hours);
    }

    // Update database
    const { error: updateError } = await supabase
      .from('destinations')
      .update(updateData)
      .eq('slug', slug);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: enriched,
    });

  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Enrichment API error:', error);
    console.error('   Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: 'Enrichment failed',
        message: error.message,
        details: error.stack?.split('\n').slice(0, 3).join('\n'),
      },
      { status: 500 }
    );
  }
}
