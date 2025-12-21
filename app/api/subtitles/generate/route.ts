/**
 * Generate Subtitle API Endpoint
 *
 * POST /api/subtitles/generate
 *
 * Generates an AI-powered subtitle for a destination using Claude.
 * Requires API secret authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateSubtitle, isAnthropicConfigured } from '@/lib/ai/anthropic';
import type { SubtitleGenerationResult } from '@/types/subtitle';

/**
 * Verify API secret token for authentication
 */
function verifyApiSecret(request: NextRequest): boolean {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const secret = process.env.SUBTITLE_API_SECRET;

  // If no secret configured, deny all requests
  if (!secret) {
    console.error('[Subtitle API] SUBTITLE_API_SECRET not configured');
    return false;
  }

  return token === secret;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication
  if (!verifyApiSecret(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check Anthropic configuration
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { destinationId, force = false } = body;

  if (!destinationId) {
    throw createValidationError('destinationId is required');
  }

  // Fetch destination from Supabase
  const supabase = createServiceRoleClient();

  // Try by slug first
  const { data: destBySlug, error: fetchError } = await supabase
    .from('destinations')
    .select('id, slug, name, city, country, category, description, architect, architectural_style, subtitle')
    .eq('slug', destinationId)
    .single();

  let destination = destBySlug;

  // Try by ID if slug doesn't work
  if (fetchError || !destination) {
    const { data: destById, error: idError } = await supabase
      .from('destinations')
      .select('id, slug, name, city, country, category, description, architect, architectural_style, subtitle')
      .eq('id', destinationId)
      .single();

    if (idError || !destById) {
      return NextResponse.json(
        { success: false, error: 'Destination not found' },
        { status: 404 }
      );
    }

    destination = destById;
  }

  // Skip if already has subtitle (unless force=true)
  if (destination.subtitle && !force) {
    const result: SubtitleGenerationResult = {
      success: true,
      subtitle: destination.subtitle,
      destinationId: destination.slug || destination.id,
      message: 'Subtitle already exists',
    };
    return createSuccessResponse(result);
  }

  console.log(`[Subtitle API] Generating subtitle for: ${destination.name}`);

  // Generate subtitle using Claude
  const subtitle = await generateSubtitle({
    name: destination.name,
    category: destination.category || 'destination',
    city: destination.city,
    country: destination.country,
    description: destination.description,
    architect: destination.architect,
    architectural_style: destination.architectural_style,
  });

  console.log(`[Subtitle API] Generated: "${subtitle}" (${subtitle.length}/50 chars)`);

  // Update destination in Supabase
  const { error: updateError } = await supabase
    .from('destinations')
    .update({
      subtitle,
      subtitle_generated_at: new Date().toISOString(),
    })
    .eq('id', destination.id);

  if (updateError) {
    console.error('[Subtitle API] Update error:', updateError);
    return NextResponse.json(
      { success: false, error: 'Failed to update destination' },
      { status: 500 }
    );
  }

  const result: SubtitleGenerationResult = {
    success: true,
    subtitle,
    destinationId: destination.slug || destination.id,
    message: `Subtitle generated (${subtitle.length}/50 chars)`,
  };

  return createSuccessResponse(result);
});

// GET endpoint for testing/checking a destination's subtitle
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication
  if (!verifyApiSecret(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const destinationId = searchParams.get('destinationId');

  if (!destinationId) {
    throw createValidationError('destinationId query parameter is required');
  }

  const supabase = createServiceRoleClient();
  const { data: destination, error } = await supabase
    .from('destinations')
    .select('id, slug, name, subtitle, subtitle_generated_at')
    .or(`slug.eq.${destinationId},id.eq.${destinationId}`)
    .single();

  if (error || !destination) {
    return NextResponse.json(
      { success: false, error: 'Destination not found' },
      { status: 404 }
    );
  }

  return createSuccessResponse({
    destinationId: destination.slug || destination.id,
    name: destination.name,
    subtitle: destination.subtitle,
    generatedAt: destination.subtitle_generated_at,
    hasSubtitle: !!destination.subtitle,
  });
});
