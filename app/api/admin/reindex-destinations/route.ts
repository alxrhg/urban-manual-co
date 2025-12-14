/**
 * Admin Reindex Destinations API Route
 *
 * POST /api/admin/reindex-destinations
 *
 * Upserts destination embeddings to Upstash Vector.
 * Can reindex all destinations or only changed ones.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDestinationEmbedding } from '@/lib/ml/embeddings';
import { batchUpsertDestinationEmbeddings } from '@/lib/upstash-vector';
import { withAdminAuth, createSuccessResponse, createValidationError, AdminContext } from '@/lib/errors';
import {
  adminRatelimit,
  memoryAdminRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';

export const POST = withAdminAuth(async (request: NextRequest, { user, serviceClient: supabase }: AdminContext) => {
  // Apply rate limiting
  const identifier = getIdentifier(request, user.id);
  const ratelimit = isUpstashConfigured() ? adminRatelimit : memoryAdminRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Admin rate limit exceeded. Please wait before retrying.',
      limit,
      remaining,
      reset
    );
  }

  const body = await request.json();
  const { mode = 'changed', batchSize = 10 } = body;

  // Validate batchSize range
  if (typeof batchSize !== 'number' || batchSize < 1 || batchSize > 100) {
    throw createValidationError('batchSize must be a number between 1 and 100');
  }

  // Validate mode
  if (!['all', 'changed'].includes(mode)) {
    throw createValidationError('Mode must be "all" or "changed"');
  }

  // Step 1: Fetch destinations to reindex
  let query = supabase
    .from('destinations')
    .select('id, name, city, country, category, price_range, popularity_score, michelin_stars, slug, description, ai_description, tags, updated_at');

  if (mode === 'changed') {
    // Only destinations that have been updated since last indexing
    query = query.or('last_indexed_at.is.null,updated_at.gt.last_indexed_at');
  }

  const { data: destinations, error } = await query.order('id');

  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Failed to fetch destinations');
  }

  if (!destinations || destinations.length === 0) {
    return NextResponse.json({
      message: 'No destinations to reindex',
      count: 0,
    });
  }

  // Step 2: Process destinations in batches
  const results = {
    total: destinations.length,
    processed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);

    try {
      // Generate embeddings for the batch
      const embeddingPromises = batch.map(async (dest: any) => {
        try {
          const { embedding } = await generateDestinationEmbedding({
            name: dest.name,
            city: dest.city,
            category: dest.category || undefined,
            description: dest.description || undefined,
            tags: dest.tags || undefined,
            ai_description: dest.ai_description || undefined,
          });

          return {
            destinationId: dest.id,
            embedding,
            metadata: {
              destination_id: dest.id,
              name: dest.name,
              city: dest.city,
              country: dest.country || undefined,
              category: dest.category || undefined,
              price_range: dest.price_range || undefined,
              popularity_score: dest.popularity_score || undefined,
              michelin_stars: dest.michelin_stars || undefined,
              slug: dest.slug || undefined,
            },
          };
        } catch (err) {
          console.error(`Error generating embedding for destination ${dest.id}:`, err);
          results.errors.push(`Destination ${dest.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return null;
        }
      });

      const embeddingResults = await Promise.all(embeddingPromises);
      const validEmbeddings = embeddingResults.filter((r: any): r is NonNullable<typeof r> => r !== null);

      if (validEmbeddings.length > 0) {
        // Upsert to Upstash Vector
        await batchUpsertDestinationEmbeddings(validEmbeddings);

        // Update last_indexed_at in Supabase
        const idsToUpdate = validEmbeddings.map((e: any) => e.destinationId);
        await supabase
          .from('destinations')
          .update({ last_indexed_at: new Date().toISOString() })
          .in('id', idsToUpdate);

        results.processed += validEmbeddings.length;
      }

      // Rate limiting: wait between batches
      if (i + batchSize < destinations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (err) {
      console.error(`Error processing batch starting at index ${i}:`, err);
      results.errors.push(`Batch ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({
    message: 'Reindexing complete',
    ...results,
  });
});
