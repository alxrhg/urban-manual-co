import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { generateDestinationEmbedding } from '@/lib/embeddings/generate';

const PRICE_PER_1K = Number(process.env.OPENAI_EMBEDDING_PRICE_PER_1K || '0.13');

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const cursor = parseInt(searchParams.get('cursor') || '0', 10);
    const onlyMissing = searchParams.get('onlyMissing') !== 'false';
    const throttleMs = Number(searchParams.get('throttleMs') || process.env.EMBEDDING_THROTTLE_MS || '100');

    // Fetch a page of destinations
    let query = supabase
      .from('destinations')
      .select('id, slug, name, city, category, description, content, tags, style_tags, ambience_tags, experience_tags, vector_embedding', { count: 'exact' })
      .order('id', { ascending: true })
      .range(cursor, cursor + limit - 1);

    if (onlyMissing) {
      // Filter will be handled client-side since PostgREST cannot filter vector null directly in some setups
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []);
    const processed: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ slug: string; reason: string }> = [];
    const errorBuckets = new Map<string, number>();
    let estimatedTokens = 0;

    for (const d of rows) {
      if (onlyMissing && d.vector_embedding) {
        skipped.push(d.slug);
        continue;
      }

      try {
        const embedding = await generateDestinationEmbedding({
          name: d.name || '',
          city: d.city || '',
          category: d.category || '',
          description: d.description,
          content: d.content,
          tags: d.tags || [],
          style_tags: d.style_tags || [],
          ambience_tags: d.ambience_tags || [],
          experience_tags: d.experience_tags || [],
        }, { versionTag: 'cron-refresh' });

        estimatedTokens += estimateTokens(embedding.text);

        const { error: upErr } = await supabase
          .from('destinations')
          .update({
            vector_embedding: Array.from(embedding.vector) as unknown as any,
            embedding_model: embedding.metadata.model,
            embedding_generated_at: embedding.metadata.generatedAt,
            embedding_metadata: embedding.metadata,
          })
          .eq('id', d.id);

        if (upErr) {
          failed.push({ slug: d.slug, reason: upErr.message });
          errorBuckets.set(upErr.message, (errorBuckets.get(upErr.message) || 0) + 1);
        } else {
          processed.push(d.slug);
        }
      } catch (err: any) {
        const reason = err?.message || 'embedding_failed';
        failed.push({ slug: d.slug, reason });
        errorBuckets.set(reason, (errorBuckets.get(reason) || 0) + 1);
      }

      if (throttleMs > 0) {
        await new Promise(resolve => setTimeout(resolve, throttleMs));
      }
    }

    const nextCursor = cursor + rows.length;
    const hasMore = typeof count === 'number' ? nextCursor < count : rows.length === limit;
    const estimatedCostUsd = Number(((estimatedTokens / 1000) * PRICE_PER_1K).toFixed(4));

    return NextResponse.json({
      processedCount: processed.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      processed,
      skipped,
      failed,
      nextCursor: hasMore ? nextCursor : null,
      total: count ?? null,
      errorBuckets: Object.fromEntries(errorBuckets),
      metrics: {
        estimatedTokens,
        estimatedCostUsd,
        model: process.env.OPENAI_EMBEDDING_MODEL_UPGRADED || process.env.OPENAI_EMBEDDING_MODEL,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to refresh embeddings' }, { status: 500 });
  }
}


