import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
// Support both new (publishable/secret) and legacy (anon/service_role) key naming
const key = (
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string;
const supabase = createClient(url, key);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ city: string }> }
) {
  try {
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


