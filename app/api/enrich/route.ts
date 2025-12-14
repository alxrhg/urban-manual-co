import { NextRequest } from 'next/server';
import { enrichDestination } from '@/lib/enrichment';
import { withAdminAuth, createSuccessResponse, createValidationError, AdminContext } from '@/lib/errors';

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
export const POST = withAdminAuth(async (request: NextRequest, { serviceClient: supabase }: AdminContext) => {
  const { slug, name, city, category, content } = await request.json();

  if (!slug || !name || !city) {
    throw createValidationError('Missing required fields: slug, name, city');
  }

  console.log(`Enriching: ${name} in ${city}`);

  // Enrich with Places API + Gemini
  const enriched = await enrichDestination(name, city, category, content);

  // Update database
  const { error: updateError } = await supabase
    .from('destinations')
    .update({
      place_id: enriched.places.place_id,
      rating: enriched.places.rating,
      price_level: enriched.places.price_level,
      opening_hours: enriched.places.opening_hours,
      phone_number: enriched.places.phone_number,
      website: enriched.places.website,
      google_maps_url: enriched.places.google_maps_url,
      tags: enriched.gemini.tags,
      category: enriched.category,
      last_enriched_at: new Date().toISOString(),
    })
    .eq('slug', slug);

  if (updateError) {
    throw updateError;
  }

  return createSuccessResponse({
    success: true,
    data: enriched,
  });
});
