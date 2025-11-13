import { OPENAI_EMBEDDING_DIMENSION } from '@/lib/openai';

/**
 * Ensure an embedding matches the configured vector length.
 * Trims overly long vectors and fails fast on undersized payloads.
 */
export function normalizeEmbeddingLength(vector: number[]): number[] {
  if (!Array.isArray(vector)) {
    throw new Error('Embedding payload must be an array of numbers.');
  }

  if (vector.length === OPENAI_EMBEDDING_DIMENSION) {
    return vector;
  }

  if (vector.length > OPENAI_EMBEDDING_DIMENSION) {
    console.warn(
      `[embeddings] Received ${vector.length}-dimension vector, trimming to ${OPENAI_EMBEDDING_DIMENSION}.`
    );
    return vector.slice(0, OPENAI_EMBEDDING_DIMENSION);
  }

  throw new Error(
    `[embeddings] Vector dimension ${vector.length} does not match expected ${OPENAI_EMBEDDING_DIMENSION}.`
  );
}

/**
 * Convert a normalized embedding into a pgvector-friendly string payload.
 */
export function formatEmbeddingForRpc(vector: number[]): string {
  const normalized = normalizeEmbeddingLength(vector);
  return `[${normalized.join(',')}]`;
}
