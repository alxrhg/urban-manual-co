import { NextRequest, NextResponse } from 'next/server';
import { resolveSupabaseClient } from '@/app/api/_utils/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ city: string }> }
) {
  try {
    const supabase = resolveSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const { city } = await context.params;
    const { data, error } = await supabase
      .from('itinerary_templates')
      .select('*')
      .ilike('city', `%${city}%`)
      .order('generated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load itineraries', details: e.message }, { status: 500 });
  }
}


