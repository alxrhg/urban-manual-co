/**
 * Inngest Functions: Embeddings
 *
 * Background job handlers for generating and storing destination embeddings.
 * Supports single, batch, and backfill operations.
 */

import { inngest } from "../client";
import { generateDestinationEmbedding } from "@/lib/ml/embeddings";
import {
  upsertDestinationEmbedding,
  batchUpsertDestinationEmbeddings,
  DestinationMetadata,
} from "@/lib/upstash-vector";
import { createServiceRoleClient } from "@/lib/supabase/server";

const EMBEDDING_VERSION = 2;
const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 100;

/**
 * Generate embedding for a single destination
 */
export const generateEmbedding = inngest.createFunction(
  {
    id: "generate-embedding",
    name: "Generate Destination Embedding",
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  { event: "embeddings/generate" },
  async ({ event, step }) => {
    const { destinationId } = event.data;

    // Step 1: Fetch destination data
    const destination = await step.run("fetch-destination", async () => {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("destinations")
        .select(
          "id, name, city, country, category, description, ai_description, tags, slug, price_level, michelin_stars, popularity_score"
        )
        .eq("id", destinationId)
        .single();

      if (error) throw new Error(`Failed to fetch destination: ${error.message}`);
      if (!data) throw new Error(`Destination ${destinationId} not found`);

      return data;
    });

    // Step 2: Generate embedding
    const embeddingResult = await step.run("generate-embedding", async () => {
      return await generateDestinationEmbedding({
        name: destination.name,
        city: destination.city,
        category: destination.category,
        description: destination.description,
        ai_description: destination.ai_description,
        tags: destination.tags,
      });
    });

    // Step 3: Store in Upstash Vector
    await step.run("store-vector", async () => {
      const metadata: DestinationMetadata = {
        destination_id: destination.id,
        name: destination.name,
        city: destination.city,
        country: destination.country,
        category: destination.category,
        price_range: destination.price_level?.toString(),
        popularity_score: destination.popularity_score,
        michelin_stars: destination.michelin_stars,
        slug: destination.slug,
      };

      await upsertDestinationEmbedding(
        destination.id,
        embeddingResult.embedding,
        metadata
      );
    });

    // Step 4: Update destination record
    await step.run("update-destination", async () => {
      const supabase = createServiceRoleClient();
      await supabase
        .from("destinations")
        .update({
          embedding_version: EMBEDDING_VERSION,
          embedding_updated_at: new Date().toISOString(),
          embedding_needs_update: false,
        })
        .eq("id", destinationId);
    });

    return {
      success: true,
      destinationId,
      source: embeddingResult.source,
      model: embeddingResult.model,
    };
  }
);

/**
 * Generate embeddings for a batch of destinations
 */
export const generateEmbeddingsBatch = inngest.createFunction(
  {
    id: "generate-embeddings-batch",
    name: "Generate Embeddings Batch",
    retries: 2,
  },
  { event: "embeddings/batch" },
  async ({ event, step }) => {
    const { destinationIds, batchId } = event.data;

    // Process in smaller chunks to avoid timeouts
    const chunks = [];
    for (let i = 0; i < destinationIds.length; i += 10) {
      chunks.push(destinationIds.slice(i, i + 10));
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      await step.run(`process-chunk-${i}`, async () => {
        const supabase = createServiceRoleClient();

        // Fetch destinations
        const { data: destinations, error } = await supabase
          .from("destinations")
          .select(
            "id, name, city, country, category, description, ai_description, tags, slug, price_level, michelin_stars, popularity_score"
          )
          .in("id", chunk);

        if (error || !destinations) {
          results.failed += chunk.length;
          results.errors.push(`Failed to fetch chunk ${i}: ${error?.message}`);
          return;
        }

        // Process each destination
        const embeddings: Array<{
          destinationId: number;
          embedding: number[];
          metadata: DestinationMetadata;
        }> = [];

        for (const dest of destinations) {
          try {
            const result = await generateDestinationEmbedding({
              name: dest.name,
              city: dest.city,
              category: dest.category,
              description: dest.description,
              ai_description: dest.ai_description,
              tags: dest.tags,
            });

            embeddings.push({
              destinationId: dest.id,
              embedding: result.embedding,
              metadata: {
                destination_id: dest.id,
                name: dest.name,
                city: dest.city,
                country: dest.country,
                category: dest.category,
                price_range: dest.price_level?.toString(),
                popularity_score: dest.popularity_score,
                michelin_stars: dest.michelin_stars,
                slug: dest.slug,
              },
            });

            results.processed++;

            // Rate limiting
            await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
          } catch (err) {
            results.failed++;
            results.errors.push(
              `Destination ${dest.id}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
          }
        }

        // Batch upsert to Upstash Vector
        if (embeddings.length > 0) {
          await batchUpsertDestinationEmbeddings(embeddings);

          // Update destination records
          await supabase
            .from("destinations")
            .update({
              embedding_version: EMBEDDING_VERSION,
              embedding_updated_at: new Date().toISOString(),
              embedding_needs_update: false,
            })
            .in(
              "id",
              embeddings.map((e) => e.destinationId)
            );
        }
      });
    }

    return {
      batchId,
      totalRequested: destinationIds.length,
      ...results,
    };
  }
);

/**
 * Backfill embeddings for destinations that need updates
 */
export const backfillEmbeddings = inngest.createFunction(
  {
    id: "backfill-embeddings",
    name: "Backfill Embeddings",
    retries: 1,
  },
  { event: "embeddings/backfill" },
  async ({ event, step }) => {
    const { limit = BATCH_SIZE, offset = 0 } = event.data;

    // Step 1: Find destinations needing embeddings
    const destinationIds = await step.run("find-destinations", async () => {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from("destinations")
        .select("id")
        .or(
          `embedding_version.is.null,embedding_version.lt.${EMBEDDING_VERSION},embedding_needs_update.eq.true`
        )
        .order("popularity_score", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(`Failed to query destinations: ${error.message}`);

      return (data || []).map((d) => d.id);
    });

    if (destinationIds.length === 0) {
      return {
        message: "No destinations need embedding updates",
        processed: 0,
      };
    }

    // Step 2: Dispatch batch job
    await step.sendEvent("dispatch-batch", {
      name: "embeddings/batch",
      data: {
        destinationIds,
        batchId: `backfill-${Date.now()}`,
      },
    });

    // Step 3: Schedule next backfill if there are more
    if (destinationIds.length === limit) {
      await step.sendEvent("schedule-next-backfill", {
        name: "embeddings/backfill",
        data: {
          limit,
          offset: offset + limit,
        },
      });
    }

    return {
      dispatched: destinationIds.length,
      hasMore: destinationIds.length === limit,
      nextOffset: offset + limit,
    };
  }
);

export const embeddingFunctions = [
  generateEmbedding,
  generateEmbeddingsBatch,
  backfillEmbeddings,
];
