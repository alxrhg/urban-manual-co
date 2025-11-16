/**
 * Upstash Vector Client Wrapper
 * 
 * Provides a typed interface for vector search operations.
 * Uses OpenAI text-embedding-3-large (1536 dimensions) for embeddings.
 */

import { Index } from '@upstash/vector';

// Vector dimension for OpenAI text-embedding-3-large
export const VECTOR_DIMENSION = 1536;

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
  [key: string]: string | number | undefined; // Index signature for Dict compatibility
}

// Vector search result
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: DestinationMetadata;
}

/**
 * Get the Upstash Vector index instance
 */
export function getVectorIndex(): Index<DestinationMetadata> {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Missing Upstash Vector credentials. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables.'
    );
  }

  return new Index<DestinationMetadata>({
    url,
    token,
  });
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
  
  await index.upsert({
    id: `dest-${destinationId}`,
    vector: embedding,
    metadata,
  });
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
  
  await index.upsert(
    items.map(item => ({
      id: `dest-${item.destinationId}`,
      vector: item.embedding,
      metadata: item.metadata,
    }))
  );
}

/**
 * Query the vector index for similar destinations
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
  
  const result = await index.query({
    vector: queryEmbedding,
    topK: options.topK ?? 10,
    filter: options.filter,
    includeMetadata: options.includeMetadata ?? true,
  });

  return result.map(item => ({
    id: String(item.id),
    score: item.score,
    metadata: item.metadata as DestinationMetadata,
  }));
}

/**
 * Delete a destination from the vector index
 */
export async function deleteDestinationEmbedding(destinationId: number): Promise<void> {
  const index = getVectorIndex();
  await index.delete(`dest-${destinationId}`);
}

/**
 * Get index info and statistics
 */
export async function getIndexInfo() {
  const index = getVectorIndex();
  return await index.info();
}
