import { NextRequest, NextResponse } from 'next/server';
import { openai, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';

export async function GET(_req: NextRequest) {
  const status: any = {
    openaiConfigured: Boolean(openai),
    model: OPENAI_MODEL,
    embeddingModel: OPENAI_EMBEDDING_MODEL,
  };

  if (!openai) {
    return NextResponse.json({ ok: false, ...status, hint: 'Set OPENAI_API_KEY and ensure openai pkg installed' }, { status: 500 });
  }

  try {
    // Tiny, cheap sanity request
    let modelTried = OPENAI_MODEL;
    const resp = await openai.chat.completions.create({
      model: modelTried,
      messages: [
        { role: 'system', content: 'You are a health check.' },
        { role: 'user', content: 'pong' }
      ],
      max_tokens: 2,
      temperature: 0,
    });
    status.chatOk = Boolean(resp?.choices?.length);
    status.modelUsed = modelTried;
  } catch (e: any) {
    status.chatOk = false;
    status.chatError = e?.message || String(e);
    // Retry with fallbacks if model not found
    if (String(status.chatError).includes('does not exist')) {
      const fallbacks = ['gpt-4.1', 'gpt-4o-mini'];
      for (const m of fallbacks) {
        try {
          const retry = await openai.chat.completions.create({
            model: m,
            messages: [
              { role: 'system', content: 'You are a health check.' },
              { role: 'user', content: 'pong' }
            ],
            max_tokens: 2,
            temperature: 0,
          });
          status.chatOk = Boolean(retry?.choices?.length);
          status.modelSuggested = m;
          break;
        } catch {}
      }
    }
  }

  try {
    const emb = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: 'ping',
    });
    status.embeddingOk = Array.isArray(emb?.data) && emb.data.length > 0;
  } catch (e: any) {
    status.embeddingOk = false;
    status.embeddingError = e?.message || String(e);
  }

  const ok = status.openaiConfigured && status.chatOk && status.embeddingOk;
  return NextResponse.json({ ok, ...status }, { status: ok ? 200 : 500 });
}


