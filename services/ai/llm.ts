import { getOpenAI, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/services/ai/openai';
import {
  generateTextWithGemini,
  generateJSONWithGemini,
  isGeminiAvailable,
} from '@/services/ai/gemini';

export async function generateText(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 100;

  // Prefer OpenAI if configured
  const openai = getOpenAI();
  if (openai) {
    try {
      const resp = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });
      return resp.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error('OpenAI generateText error:', error);
    }
  }

  // Fallback to Gemini (using consolidated client)
  if (isGeminiAvailable()) {
    return generateTextWithGemini(prompt, { temperature, maxOutputTokens: maxTokens });
  }

  return null;
}

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
    } catch (e) {
      console.warn('OpenAI JSON generation failed, falling back to Gemini:', e instanceof Error ? e.message : e);
    }
  }
  // Fallback to Gemini (using consolidated client)
  if (isGeminiAvailable()) {
    return generateJSONWithGemini(`${system}\nReturn ONLY valid JSON.\n\n${user}`, {
      temperature: 0.2,
    });
  }
  return null;
}

export async function embedText(input: string): Promise<number[] | null> {
  // Prefer OpenAI embeddings
  const openai = getOpenAI();
  if (openai) {
    try {
      // text-embedding-3-large default is 3072 dimensions, which now matches our database schema
      const emb = await openai.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input
      });
      return emb.data?.[0]?.embedding || null;
    } catch (error: any) {
      console.error('[embedText] OpenAI error:', error.message || error);
      throw error; // Re-throw to see actual error
    }
  }
  // Optional: add Gemini embeddings if needed in future
  throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY environment variable.');
}


