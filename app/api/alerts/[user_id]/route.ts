import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const supabase = createClient(url, key);

export async function GET(
  _req: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('opportunity_alerts')
      .select('*')
      .eq('user_id', params.user_id)
      .eq('read', false)
      .order('triggered_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load alerts', details: e.message }, { status: 500 });
  }
}


