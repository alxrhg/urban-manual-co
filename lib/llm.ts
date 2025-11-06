import { getOpenAI, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
    } catch (error: any) {
      console.warn(`${OPENAI_MODEL} failed, falling back to gpt-4o-mini:`, error.message);
      // Auto-fallback to GPT-4o-mini if GPT-5 Nano fails
      try {
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        });
        return resp.choices?.[0]?.message?.content || null;
      } catch (fallbackError: any) {
        console.error('GPT-4o-mini fallback also failed:', fallbackError.message);
      }
    }
  }

  // Fallback to Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini generateText error:', error);
    }
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
    } catch (error: any) {
      // Auto-fallback to GPT-4o-mini if GPT-5 Nano fails
      console.warn(`${OPENAI_MODEL} failed, falling back to gpt-4o-mini:`, error.message);
      try {
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `${system}\nReturn ONLY valid JSON.` },
            { role: 'user', content: user }
          ],
          temperature: 0.2,
        });
        const text = resp.choices?.[0]?.message?.content || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      } catch (fallbackError: any) {
        console.error('GPT-4o-mini fallback also failed:', fallbackError.message);
      }
    }
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

export async function embedText(input: string): Promise<number[] | null> {
  // Prefer OpenAI embeddings
  const openai = getOpenAI();
  if (openai) {
    try {
      // text-embedding-3-large default is 3072 dimensions, but we need 1536
      // Explicitly specify dimensions to match our database schema
      const emb = await openai.embeddings.create({ 
        model: OPENAI_EMBEDDING_MODEL, 
        input,
        dimensions: 1536  // Explicitly set to 1536 to match database schema
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


