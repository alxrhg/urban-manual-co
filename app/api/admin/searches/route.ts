import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const { serviceClient } = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 500) : 100;

    const { data, error } = await serviceClient
      .from('user_interactions')
      .select('id, created_at, interaction_type, user_id, metadata')
      .eq('interaction_type', 'search')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Admin] Failed to fetch search logs:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[Admin] Unexpected error fetching search logs:', error);
    return NextResponse.json({ error: 'Failed to fetch search logs' }, { status: 500 });
  }
}
