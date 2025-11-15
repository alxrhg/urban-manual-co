import { NextResponse } from 'next/server';

import { requireAdmin, AuthError } from '@/lib/adminAuth';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const { serviceClient } = await requireAdmin(request);
    const url = new URL(request.url);
    const rawOffset = Number(url.searchParams.get('offset') ?? '0');
    const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
    const limitCandidate = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : DEFAULT_LIMIT;
    const limit = Math.min(limitCandidate, MAX_LIMIT);
    const search = url.searchParams.get('search')?.trim() ?? '';

    let query = serviceClient
      .from('destinations')
      .select(
        'slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown, parent_destination_id',
        { count: 'exact' }
      )
      .order('slug', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      const escaped = search.replace(/[%_]/g, match => `\\${match}`);
      const searchPattern = `%${escaped}%`;
      const filters = [
        `name.ilike.${searchPattern}`,
        `city.ilike.${searchPattern}`,
        `slug.ilike.${searchPattern}`,
        `category.ilike.${searchPattern}`,
      ].join(',');
      query = query.or(filters);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Admin Destinations API] Error loading destinations:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to load destinations' },
        { status: error.code === 'PGRST116' ? 400 : 500 }
      );
    }

    return NextResponse.json({
      data: data ?? [],
      total: typeof count === 'number' ? count : data?.length ?? 0,
      offset,
      limit,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[Admin Destinations API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error loading destinations' }, { status: 500 });
  }
}
