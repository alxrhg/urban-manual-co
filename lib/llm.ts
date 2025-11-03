import { openai, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const ENABLE_GEMINI_FALLBACK = (process.env.ENABLE_GEMINI_FALLBACK || 'false').toLowerCase() === 'true';
const genAI = GOOGLE_API_KEY && ENABLE_GEMINI_FALLBACK ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

export async function generateJSON(system: string, user: string): Promise<any | null> {
  // Prefer OpenAI if configured
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
  // Optional fallback to Gemini (disabled by default)
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(`${system}\nReturn ONLY valid JSON.\n\n${user}`);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (err) {
      console.error('[LLM] Gemini fallback error:', (err as any)?.message || err);
    }
  }
  return null;
}

export async function embedText(input: string): Promise<number[] | null> {
  // Prefer OpenAI embeddings
  if (openai) {
    try {
      const emb = await openai.embeddings.create({ model: OPENAI_EMBEDDING_MODEL, input });
      return emb.data?.[0]?.embedding || null;
    } catch (_) {}
  }
  // No Gemini embeddings fallback to avoid model/version issues
  return null;
}


