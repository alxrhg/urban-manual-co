/**
 * Supabase Vector Buckets Client Wrapper
 *
 * Provides a typed interface for vector search operations using Supabase Vector Buckets.
 * Uses OpenAI text-embedding-3-large (1536 dimensions) for embeddings.
 *
 * Migration from Upstash Vector - maintains compatible API surface.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Vector dimension for OpenAI text-embedding-3-large
export const VECTOR_DIMENSION = 1536;

// Index configuration
export const VECTOR_BUCKET_NAME = "embeddings";
export const VECTOR_INDEX_NAME = "destinations";

// Metadata structure for destinations
export interface DestinationMetadata {
  destination_id: number;
  name: string;
  city: string;
  country?: string;
  category?: string;
  price_range?: string;
  popularity_score?: number;
  michelin_stars?: number;
  slug?: string;
  [key: string]: string | number | undefined;
}

// Vector search result
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: DestinationMetadata;
}

// Internal types for Supabase Vector Buckets API
interface VectorBucketIndex {
  putVectors(options: {
    vectors: Array<{
      key: string;
      data: { float32: number[] };
      metadata?: Record<string, unknown>;
    }>;
  }): Promise<{ error?: Error }>;

  queryVectors(options: {
    queryVector: { float32: number[] };
    topK?: number;
    returnDistance?: boolean;
    returnMetadata?: boolean;
    filter?: Record<string, unknown>;
  }): Promise<{
    data?: Array<{
      key: string;
      distance: number;
      metadata?: Record<string, unknown>;
    }>;
    error?: Error;
  }>;

  deleteVectors(options: { keys: string[] }): Promise<{ error?: Error }>;

  getVectors(options: {
    keys: string[];
  }): Promise<{
    data?: Array<{
      key: string;
      data: { float32: number[] };
      metadata?: Record<string, unknown>;
    }>;
    error?: Error;
  }>;
}

interface VectorBucket {
  createIndex(options: {
    indexName: string;
    dataType: "float32" | "int8" | "binary";
    dimension: number;
    distanceMetric: "cosine" | "euclidean" | "l2";
  }): Promise<{ error?: Error }>;

  index(indexName: string): VectorBucketIndex;

  listIndexes(): Promise<{
    data?: Array<{ name: string; dimension: number; distanceMetric: string }>;
    error?: Error;
  }>;

  deleteIndex(indexName: string): Promise<{ error?: Error }>;
}

interface VectorStorage {
  from(bucketName: string): VectorBucket;
  createBucket(
    bucketName: string,
    options?: { public?: boolean }
  ): Promise<{ error?: Error }>;
  listBuckets(): Promise<{ data?: Array<{ name: string }>; error?: Error }>;
}

interface SupabaseClientWithVectors extends SupabaseClient {
  storage: SupabaseClient["storage"] & {
    vectors: VectorStorage;
  };
}

// Singleton client instance
let supabaseClient: SupabaseClientWithVectors | null = null;

/**
 * Get the Supabase client with vector bucket support
 */
function getSupabaseClient(): SupabaseClientWithVectors {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  supabaseClient = createClient(url, serviceKey) as SupabaseClientWithVectors;
  return supabaseClient;
}

/**
 * Get the vector bucket instance
 */
function getVectorBucket(): VectorBucket {
  const client = getSupabaseClient();
  return client.storage.vectors.from(VECTOR_BUCKET_NAME);
}

/**
 * Get the vector index instance for destinations
 */
export function getVectorIndex(): VectorBucketIndex {
  const bucket = getVectorBucket();
  return bucket.index(VECTOR_INDEX_NAME);
}

/**
 * Initialize the vector bucket and index if they don't exist
 * Call this during app initialization or deployment
 */
export async function initializeVectorBucket(): Promise<void> {
  const client = getSupabaseClient();

  // Check if bucket exists, create if not
  const { data: buckets } = await client.storage.vectors.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === VECTOR_BUCKET_NAME);

  if (!bucketExists) {
    const { error: bucketError } = await client.storage.vectors.createBucket(
      VECTOR_BUCKET_NAME,
      { public: false }
    );
    if (bucketError) {
      throw new Error(`Failed to create vector bucket: ${bucketError.message}`);
    }
    console.log(`Created vector bucket: ${VECTOR_BUCKET_NAME}`);
  }

  // Check if index exists, create if not
  const bucket = getVectorBucket();
  const { data: indexes } = await bucket.listIndexes();
  const indexExists = indexes?.some((i) => i.name === VECTOR_INDEX_NAME);

  if (!indexExists) {
    const { error: indexError } = await bucket.createIndex({
      indexName: VECTOR_INDEX_NAME,
      dataType: "float32",
      dimension: VECTOR_DIMENSION,
      distanceMetric: "cosine",
    });
    if (indexError) {
      throw new Error(`Failed to create vector index: ${indexError.message}`);
    }
    console.log(
      `Created vector index: ${VECTOR_INDEX_NAME} (dimension: ${VECTOR_DIMENSION}, metric: cosine)`
    );
  }
}

/**
 * Upsert a destination embedding to the vector index
 */
export async function upsertDestinationEmbedding(
  destinationId: number,
  embedding: number[],
  metadata: DestinationMetadata
): Promise<void> {
  const index = getVectorIndex();

  const { error } = await index.putVectors({
    vectors: [
      {
        key: `dest-${destinationId}`,
        data: { float32: embedding },
        metadata: metadata as Record<string, unknown>,
      },
    ],
  });

  if (error) {
    throw new Error(`Failed to upsert embedding: ${error.message}`);
  }
}

/**
 * Batch upsert destination embeddings
 */
export async function batchUpsertDestinationEmbeddings(
  items: Array<{
    destinationId: number;
    embedding: number[];
    metadata: DestinationMetadata;
  }>
): Promise<void> {
  const index = getVectorIndex();

  // Supabase Vector Buckets supports up to 500 vectors per request
  const BATCH_SIZE = 500;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const { error } = await index.putVectors({
      vectors: batch.map((item) => ({
        key: `dest-${item.destinationId}`,
        data: { float32: item.embedding },
        metadata: item.metadata as Record<string, unknown>,
      })),
    });

    if (error) {
      throw new Error(`Failed to batch upsert embeddings: ${error.message}`);
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

/**
 * Query the vector index for similar destinations
 *
 * Note: Supabase Vector Buckets returns distance (lower = more similar)
 * We convert to score (higher = more similar) for API compatibility
 */
export async function queryVectorIndex(
  queryEmbedding: number[],
  options: {
    topK?: number;
    filter?: string;
    includeMetadata?: boolean;
  } = {}
): Promise<VectorSearchResult[]> {
  const index = getVectorIndex();

  // Parse filter string to object if provided
  // Upstash uses strings like 'city = "London"', we need to convert
  let filterObj: Record<string, unknown> | undefined;
  if (options.filter) {
    const match = options.filter.match(/(\w+)\s*=\s*"([^"]+)"/);
    if (match) {
      filterObj = { [match[1]]: match[2] };
    }
  }

  const { data, error } = await index.queryVectors({
    queryVector: { float32: queryEmbedding },
    topK: options.topK ?? 10,
    returnDistance: true,
    returnMetadata: options.includeMetadata ?? true,
    filter: filterObj,
  });

  if (error) {
    throw new Error(`Failed to query vectors: ${error.message}`);
  }

  // Convert distance to similarity score (1 - distance for cosine)
  // Cosine distance ranges from 0 (identical) to 2 (opposite)
  return (data ?? []).map((item) => ({
    id: item.key,
    score: 1 - item.distance, // Convert distance to similarity
    metadata: item.metadata as DestinationMetadata,
  }));
}

/**
 * Delete a destination from the vector index
 */
export async function deleteDestinationEmbedding(
  destinationId: number
): Promise<void> {
  const index = getVectorIndex();

  const { error } = await index.deleteVectors({
    keys: [`dest-${destinationId}`],
  });

  if (error) {
    throw new Error(`Failed to delete embedding: ${error.message}`);
  }
}

/**
 * Get index info and statistics
 * Note: Supabase Vector Buckets API differs from Upstash
 */
export async function getIndexInfo(): Promise<{
  name: string;
  dimension: number;
  distanceMetric: string;
  vectorCount?: number;
}> {
  const bucket = getVectorBucket();
  const { data: indexes, error } = await bucket.listIndexes();

  if (error) {
    throw new Error(`Failed to get index info: ${error.message}`);
  }

  const index = indexes?.find((i) => i.name === VECTOR_INDEX_NAME);

  if (!index) {
    throw new Error(`Index ${VECTOR_INDEX_NAME} not found`);
  }

  return {
    name: index.name,
    dimension: index.dimension,
    distanceMetric: index.distanceMetric,
  };
}

/**
 * Compatibility function for direct index queries (used by concierge)
 * Mimics Upstash Vector's query interface
 */
export function createCompatibleIndex() {
  const index = getVectorIndex();

  return {
    async query(options: {
      vector: number[];
      topK?: number;
      includeMetadata?: boolean;
      filter?: string;
    }): Promise<
      Array<{
        id: string;
        score: number;
        metadata?: DestinationMetadata;
      }>
    > {
      const results = await queryVectorIndex(options.vector, {
        topK: options.topK,
        includeMetadata: options.includeMetadata,
        filter: options.filter,
      });

      return results.map((r) => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata,
      }));
    },
  };
}
