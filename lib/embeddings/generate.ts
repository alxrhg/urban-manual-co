import { embedText } from '@/lib/llm';
import { OPENAI_EMBEDDING_MODEL } from '@/lib/openai';

export type DestinationEmbeddingInput = {
  name: string;
  city?: string;
  category?: string;
  content?: string;
  description?: string;
  tags?: string[];
  style_tags?: string[];
  ambience_tags?: string[];
  experience_tags?: string[];
};

export type DestinationEmbeddingMetadata = {
  model: string;
  versionTag: string;
  dimensions: number;
  generatedAt: string;
};

export type DestinationEmbeddingResult = {
  text: string;
  vector: Float32Array;
  serialized: string;
  metadata: DestinationEmbeddingMetadata;
};

const DEFAULT_VERSION_TAG =
  process.env.EMBEDDING_MODEL_VERSION ||
  process.env.OPENAI_EMBEDDING_MODEL_VERSION ||
  'latest';

const UPGRADED_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL_UPGRADED || OPENAI_EMBEDDING_MODEL;

export function buildDestinationEmbeddingText(destination: DestinationEmbeddingInput): string {
  const tags = new Set<string>();
  (destination.tags || []).forEach(tag => tags.add(tag));
  (destination.style_tags || []).forEach(tag => tags.add(tag));
  (destination.ambience_tags || []).forEach(tag => tags.add(tag));
  (destination.experience_tags || []).forEach(tag => tags.add(tag));

  const parts = [
    destination.name,
    destination.city,
    destination.category,
    destination.content || destination.description,
    Array.from(tags).join(', ')
  ].filter(Boolean);

  return parts.join('\n').trim();
}

export function serializeEmbedding(embedding: Float32Array | number[]): string {
  if (Array.isArray(embedding)) {
    return `[${embedding.join(',')}]`;
  }
  return `[${Array.prototype.join.call(embedding, ',')}]`;
}

/**
 * Generate embedding for a destination using the configured OpenAI embedding model.
 * Returns the vector, serialized representation for pgvector RPCs, and metadata useful for monitoring.
 */
export async function generateDestinationEmbedding(
  destination: DestinationEmbeddingInput,
  options: { model?: string; dimensions?: number; versionTag?: string } = {}
): Promise<DestinationEmbeddingResult> {
  const embeddingText = buildDestinationEmbeddingText(destination);

  if (!embeddingText) {
    throw new Error('Destination embedding input is empty');
  }

  const model = options.model || UPGRADED_MODEL;
  const vectorValues = await embedText(embeddingText, {
    model,
    dimensions: options.dimensions,
  });

  if (!vectorValues) {
    throw new Error('Failed to generate embedding');
  }

  const vector = Float32Array.from(vectorValues);
  const metadata: DestinationEmbeddingMetadata = {
    model,
    versionTag: options.versionTag || DEFAULT_VERSION_TAG,
    dimensions: vector.length,
    generatedAt: new Date().toISOString(),
  };

  return {
    text: embeddingText,
    vector,
    serialized: serializeEmbedding(vector),
    metadata,
  };
}

