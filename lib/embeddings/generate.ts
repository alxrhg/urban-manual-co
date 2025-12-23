import { embedText } from '@/lib/llm';

// Type for Google Places review
interface GooglePlacesReview {
  text?: string;
  author_name?: string;
  rating?: number;
  [key: string]: unknown;
}

/**
 * Generate embedding for a destination using OpenAI text-embedding-3-large
 * Combines all destination fields into a single text for embedding
 */
export async function generateDestinationEmbedding(destination: {
  name: string;
  city: string;
  category: string;
  content?: string;
  description?: string;
  tags?: string[];
  reviews_json?: GooglePlacesReview[] | null;
}): Promise<number[]> {
  // Extract review text from Google Places reviews
  const reviewTexts = (destination.reviews_json || [])
    .map(review => review.text)
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
    .slice(0, 5) // Limit to 5 reviews to avoid token limits
    .join(' ');

  // Combine all text fields into a single embedding text
  const embeddingText = [
    destination.name,
    destination.city,
    destination.category,
    destination.content || destination.description || '',
    destination.tags?.join(' ') || '',
    reviewTexts
  ]
    .filter(Boolean)
    .join(' ');

  // Use the embedText utility from llm.ts (which uses OPENAI_EMBEDDING_MODEL)
  const embedding = await embedText(embeddingText);
  
  if (!embedding) {
    throw new Error('Failed to generate embedding');
  }

  return embedding;
}

