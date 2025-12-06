#!/usr/bin/env npx tsx
/**
 * Migration Script: Upstash Vector → Supabase Vector Buckets
 *
 * This script migrates all destination embeddings from the Supabase `destinations` table
 * (where embeddings are stored) to Supabase Vector Buckets.
 *
 * Prerequisites:
 * - Supabase Vector Buckets feature enabled on your project
 * - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables set
 *
 * Usage:
 *   npx tsx scripts/migrate-to-supabase-vector-buckets.ts [--dry-run] [--batch-size=50]
 *
 * Options:
 *   --dry-run     Preview what would be migrated without making changes
 *   --batch-size  Number of vectors to process per batch (default: 50)
 */

import { createClient } from "@supabase/supabase-js";
import {
  initializeVectorBucket,
  batchUpsertDestinationEmbeddings,
  getIndexInfo,
  VECTOR_BUCKET_NAME,
  VECTOR_INDEX_NAME,
  VECTOR_DIMENSION,
  type DestinationMetadata,
} from "../lib/supabase-vector-buckets";

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const batchSizeArg = args.find((a) => a.startsWith("--batch-size="));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split("=")[1]) : 50;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DestinationWithEmbedding {
  id: number;
  name: string;
  city: string;
  country: string | null;
  category: string | null;
  price_range: string | null;
  popularity_score: number | null;
  michelin_stars: number | null;
  slug: string | null;
  embedding: number[] | null;
  vector_embedding: number[] | null;
}

async function migrate() {
  console.log("=".repeat(60));
  console.log("Supabase Vector Buckets Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Target bucket: ${VECTOR_BUCKET_NAME}`);
  console.log(`Target index: ${VECTOR_INDEX_NAME}`);
  console.log(`Vector dimension: ${VECTOR_DIMENSION}`);
  console.log("=".repeat(60));

  // Step 1: Initialize vector bucket and index
  if (!dryRun) {
    console.log("\n[1/4] Initializing vector bucket and index...");
    try {
      await initializeVectorBucket();
      console.log("  ✓ Vector bucket and index ready");
    } catch (err) {
      console.error("  ✗ Failed to initialize:", err);
      process.exit(1);
    }
  } else {
    console.log("\n[1/4] Would initialize vector bucket and index");
  }

  // Step 2: Fetch destinations with embeddings
  console.log("\n[2/4] Fetching destinations with embeddings...");
  const { data: destinations, error } = await supabase
    .from("destinations")
    .select(
      "id, name, city, country, category, price_range, popularity_score, michelin_stars, slug, embedding, vector_embedding"
    )
    .order("id");

  if (error) {
    console.error("  ✗ Failed to fetch destinations:", error.message);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log("  No destinations found");
    process.exit(0);
  }

  console.log(`  Found ${destinations.length} total destinations`);

  // Filter destinations that have embeddings
  const destinationsWithEmbeddings = (
    destinations as DestinationWithEmbedding[]
  ).filter((d) => {
    const embedding = d.embedding || d.vector_embedding;
    return embedding && Array.isArray(embedding) && embedding.length > 0;
  });

  console.log(
    `  ${destinationsWithEmbeddings.length} destinations have embeddings`
  );

  if (destinationsWithEmbeddings.length === 0) {
    console.log("\n  No embeddings to migrate.");
    console.log(
      "  Run the reindex-destinations API or backfill-embeddings script first."
    );
    process.exit(0);
  }

  // Step 3: Migrate in batches
  console.log("\n[3/4] Migrating embeddings to Supabase Vector Buckets...");

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < destinationsWithEmbeddings.length; i += BATCH_SIZE) {
    const batch = destinationsWithEmbeddings.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(
      destinationsWithEmbeddings.length / BATCH_SIZE
    );

    process.stdout.write(
      `  Batch ${batchNum}/${totalBatches} (${batch.length} items)... `
    );

    const items = batch.map((dest) => {
      // Use embedding or vector_embedding, whichever is available
      let embedding = dest.embedding || dest.vector_embedding;

      // Truncate or pad to match expected dimension
      if (embedding && embedding.length !== VECTOR_DIMENSION) {
        if (embedding.length > VECTOR_DIMENSION) {
          // Truncate to expected dimension
          embedding = embedding.slice(0, VECTOR_DIMENSION);
        } else {
          // Pad with zeros (shouldn't normally happen)
          embedding = [...embedding, ...Array(VECTOR_DIMENSION - embedding.length).fill(0)];
        }
      }

      const metadata: DestinationMetadata = {
        destination_id: dest.id,
        name: dest.name,
        city: dest.city,
        country: dest.country || undefined,
        category: dest.category || undefined,
        price_range: dest.price_range || undefined,
        popularity_score: dest.popularity_score || undefined,
        michelin_stars: dest.michelin_stars || undefined,
        slug: dest.slug || undefined,
      };

      return {
        destinationId: dest.id,
        embedding: embedding as number[],
        metadata,
      };
    });

    if (!dryRun) {
      try {
        await batchUpsertDestinationEmbeddings(items);
        processed += batch.length;
        console.log("✓");
      } catch (err) {
        failed += batch.length;
        const errMsg =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Batch ${batchNum}: ${errMsg}`);
        console.log("✗");
      }
    } else {
      processed += batch.length;
      console.log("(dry run)");
    }

    // Small delay between batches
    if (i + BATCH_SIZE < destinationsWithEmbeddings.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 4: Summary
  console.log("\n[4/4] Migration Summary");
  console.log("=".repeat(60));
  console.log(`  Total destinations: ${destinations.length}`);
  console.log(`  With embeddings: ${destinationsWithEmbeddings.length}`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("\n  Errors:");
    errors.forEach((e) => console.log(`    - ${e}`));
  }

  if (!dryRun && processed > 0) {
    console.log("\n  Verifying index...");
    try {
      const info = await getIndexInfo();
      console.log(`  ✓ Index "${info.name}" ready`);
      console.log(`    Dimension: ${info.dimension}`);
      console.log(`    Distance metric: ${info.distanceMetric}`);
    } catch (err) {
      console.log("  ⚠ Could not verify index:", err);
    }
  }

  console.log("\n" + "=".repeat(60));
  if (dryRun) {
    console.log("DRY RUN COMPLETE - No changes were made");
    console.log("Run without --dry-run to perform actual migration");
  } else {
    console.log("MIGRATION COMPLETE");
  }
  console.log("=".repeat(60));
}

// Run migration
migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
