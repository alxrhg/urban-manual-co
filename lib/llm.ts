import { openai, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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
  if (openai) {
    try {
      const emb = await openai.embeddings.create({ model: OPENAI_EMBEDDING_MODEL, input });
      return emb.data?.[0]?.embedding || null;
    } catch (_) {}
  }
  // Optional: add Gemini embeddings if needed in future
  return null;
}


