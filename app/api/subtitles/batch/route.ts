/**
 * Batch Subtitle Generation API
 *
 * POST /api/subtitles/batch
 *
 * Generates subtitles for multiple destinations that don't have one yet.
 * Can be triggered by a cron job or manually via admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateSubtitle, isAnthropicConfigured } from '@/lib/ai/anthropic';
import type { BatchGenerationResult, SubtitleGenerationResult } from '@/types/subtitle';

/**
 * Verify cron or API secret token
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');

  // Check for cron secret (Vercel cron jobs)
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }

  // Check for API secret
  if (process.env.SUBTITLE_API_SECRET) {
    const token = authHeader?.replace('Bearer ', '');
    return token === process.env.SUBTITLE_API_SECRET;
  }

  return false;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify authorization
  if (!verifyAuthorization(request)) {
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

  const body = await request.json().catch(() => ({}));
  const { batchSize = 10, dryRun = false } = body;

  // Validate batch size
  if (batchSize < 1 || batchSize > 50) {
    throw createValidationError('batchSize must be between 1 and 50');
  }

  console.log(`[Batch] Starting batch generation (size: ${batchSize}, dryRun: ${dryRun})`);

  const supabase = createServiceRoleClient();

  // Fetch destinations without subtitles
  const { data: destinations, error: fetchError } = await supabase
    .from('destinations')
    .select('id, slug, name, city, country, category, description, architect, architectural_style')
    .is('subtitle', null)
    .order('id', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    console.error('[Batch] Supabase fetch error:', fetchError);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch destinations' },
      { status: 500 }
    );
  }

  if (!destinations || destinations.length === 0) {
    return createSuccessResponse<BatchGenerationResult>({
      success: true,
      processed: 0,
      total: 0,
      results: [],
      errors: [],
    }, { message: 'No destinations need subtitles' });
  }

  console.log(`[Batch] Found ${destinations.length} destinations without subtitles`);

  const results: SubtitleGenerationResult[] = [];
  const errors: string[] = [];

  // Process each destination sequentially with rate limiting
  for (const dest of destinations) {
    try {
      console.log(`[Batch] Processing: ${dest.name}`);

      const subtitle = await generateSubtitle({
        name: dest.name,
        category: dest.category || 'destination',
        city: dest.city,
        country: dest.country,
        description: dest.description,
        architect: dest.architect,
        architectural_style: dest.architectural_style,
      });

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('destinations')
          .update({
            subtitle,
            subtitle_generated_at: new Date().toISOString(),
          })
          .eq('id', dest.id);

        if (updateError) {
          throw updateError;
        }
      }

      results.push({
        success: true,
        subtitle,
        destinationId: dest.slug || dest.id,
        message: `Generated (${subtitle.length}/50 chars)`,
      });

      console.log(`[Batch] Generated: "${subtitle}" for ${dest.name}`);

      // Rate limiting - wait between API calls to avoid hitting limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Batch] Error processing ${dest.name}:`, errorMessage);

      errors.push(`${dest.slug || dest.id}: ${errorMessage}`);
      results.push({
        success: false,
        destinationId: dest.slug || dest.id,
        message: 'Failed to generate subtitle',
        error: errorMessage,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  console.log(`[Batch] Completed: ${successCount}/${destinations.length} successful`);

  return createSuccessResponse<BatchGenerationResult>({
    success: errors.length === 0,
    processed: successCount,
    total: destinations.length,
    results,
    errors,
  }, { dryRun, message: dryRun ? 'Dry run completed' : 'Batch generation completed' });
});

// GET endpoint to check batch status
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify authorization
  if (!verifyAuthorization(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createServiceRoleClient();

  // Get statistics
  const { count: totalCount } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true });

  const { count: subtitleCount } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
    .not('subtitle', 'is', null);

  const { data: recent } = await supabase
    .from('destinations')
    .select('id, slug, name, subtitle, subtitle_generated_at')
    .not('subtitle', 'is', null)
    .order('subtitle_generated_at', { ascending: false })
    .limit(5);

  return createSuccessResponse({
    totalDestinations: totalCount || 0,
    withSubtitles: subtitleCount || 0,
    pendingSubtitles: (totalCount || 0) - (subtitleCount || 0),
    recentlyGenerated: recent || [],
    anthropicConfigured: isAnthropicConfigured(),
  });
});
