import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractCuisineFromTypes } from '@/lib/enrichment';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

// POST /api/enrich/tags
// Body: { slug: string }
// Purpose: Rebuild cuisine tags from existing place_types_json without external API calls
export async function POST(request: NextRequest) {
  try {
    // Ensure admin
    await requireAdmin(request);

    const { slug } = await request.json();
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });
    }

    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
    const supabase = createClient(url, key);

    // Fetch destination types and existing tags
    const { data, error } = await supabase
      .from('destinations')
      .select('id, slug, name, place_types_json, tags')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
    }

    const types = Array.isArray(data.place_types_json)
      ? (data.place_types_json as string[])
      : typeof data.place_types_json === 'string'
        ? (() => { try { return JSON.parse(data.place_types_json as unknown as string); } catch { return []; } })()
        : [];

    const cuisineTags = extractCuisineFromTypes(types);
    const existingTags = Array.isArray(data.tags) ? data.tags : [];
    const mergedTags = Array.from(new Set([ ...cuisineTags, ...existingTags ]));

    // Only update if changed
    const unchanged = mergedTags.length === existingTags.length && mergedTags.every(t => existingTags.includes(t));
    if (unchanged) {
      return NextResponse.json({ success: true, updated: false, tags: existingTags, message: 'No change' });
    }

    const { error: updateErr } = await supabase
      .from('destinations')
      .update({ tags: mergedTags })
      .eq('id', data.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, updated: true, tags: mergedTags });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to update tags' }, { status: 500 });
  }
}


