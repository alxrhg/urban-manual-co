import { getOpenAI, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export async function generateJSON(system: string, user: string): Promise<any | null> {
  // Prefer OpenAI if configured
  const openai = getOpenAI();
  if (openai) {
    try {
      const resp = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: `${system}\nReturn ONLY valid JSON.` },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
      });
      const text = resp.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (_) {}
  }
  // Fallback to Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(`${system}\nReturn ONLY valid JSON.\n\n${user}`);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (_) {}
  }
  return null;
}

/**
 * Generate embedding with caching, retry logic, and exponential backoff
 * Uses OpenAI text-embedding-3-large with 1536 dimensions
 */
export async function embedText(input: string, maxRetries: number = 3, useCache: boolean = true): Promise<number[] | null> {
  // Check cache first
  if (useCache) {
    try {
      const { getCachedEmbedding, setCachedEmbedding } = await import('@/lib/travel-intelligence/cache');
      const cached = getCachedEmbedding(input);
      if (cached) {
        return cached;
      }
    } catch {
      // Cache not available, continue without it
    }
  }

  const openai = getOpenAI();
  if (!openai) {
    console.error('[embedText] OpenAI client not initialized. Check OPENAI_API_KEY environment variable.');
    return null;
  }

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // text-embedding-3-large default is 3072 dimensions, but we need 1536
      // Explicitly specify dimensions to match our database schema
      const emb = await openai.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input,
        dimensions: 1536  // Explicitly set to 1536 to match database schema
      });

      const embedding = emb.data?.[0]?.embedding || null;

      // Cache the result
      if (embedding && useCache) {
        try {
          const { setCachedEmbedding } = await import('@/lib/travel-intelligence/cache');
          setCachedEmbedding(input, embedding);
        } catch {
          // Cache not available, continue without it
        }
      }

      return embedding;
    } catch (error: any) {
      lastError = error;
      const isRateLimitError = error.status === 429 || error.message?.includes('rate limit');
      const isRetryable = isRateLimitError || error.status >= 500;

      if (!isRetryable || attempt === maxRetries - 1) {
        console.error(`[embedText] OpenAI error (attempt ${attempt + 1}/${maxRetries}):`, error.message || error);
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.warn(`[embedText] Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  console.error('[embedText] All retry attempts failed:', lastError?.message || lastError);
  return null;
}


