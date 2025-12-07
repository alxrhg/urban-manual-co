/**
 * ML Service Embedding Client
 *
 * Provides functions to generate embeddings via the ml-service.
 * Falls back to OpenAI if ml-service is unavailable.
 */

import OpenAI from 'openai';
import { OPENAI_EMBEDDING_MODEL } from '@/lib/openai';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY;

// Lazy initialize OpenAI client
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for fallback embeddings');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  source: 'ml-service' | 'openai';
}

/**
 * Generate embedding for arbitrary text using ml-service
 */
export async function generateTextEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/embed/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ML_SERVICE_API_KEY && { 'X-API-Key': ML_SERVICE_API_KEY }),
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.embedding,
      model: data.model || 'ml-service-default',
      source: 'ml-service',
    };
  } catch (error) {
    console.warn('ML service unavailable, falling back to OpenAI:', error);
    return await generateTextEmbeddingOpenAI(text);
  }
}

/**
 * Generate embedding for a destination document using ml-service
 */
export async function generateDestinationEmbedding(destination: {
  name: string;
  city: string;
  category?: string;
  description?: string;
  tags?: string[];
  ai_description?: string;
}): Promise<EmbeddingResult> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/embed/destination`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ML_SERVICE_API_KEY && { 'X-API-Key': ML_SERVICE_API_KEY }),
      },
      body: JSON.stringify(destination),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.embedding,
      model: data.model || 'ml-service-default',
      source: 'ml-service',
    };
  } catch (error) {
    console.warn('ML service unavailable, falling back to OpenAI:', error);
    // Construct text from destination fields
    const text = [
      destination.name,
      destination.city,
      destination.category,
      destination.ai_description || destination.description,
      ...(destination.tags || []),
    ]
      .filter(Boolean)
      .join('. ');
    return await generateTextEmbeddingOpenAI(text);
  }
}

/**
 * Fallback: Generate embedding using OpenAI directly
 * Uses text-embedding-3-large with 1536 dimensions to match Upstash Vector index
 */
async function generateTextEmbeddingOpenAI(text: string): Promise<EmbeddingResult> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
    dimensions: 1536, // Match Upstash Vector index dimension
  });

  return {
    embedding: response.data[0].embedding,
    model: OPENAI_EMBEDDING_MODEL,
    source: 'openai',
  };
}
