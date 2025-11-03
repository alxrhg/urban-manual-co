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
      .from('personalization_scores')
      .select('cache, ttl')
      .eq('user_id', params.user_id)
      .order('ttl', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const ttl = data?.ttl ? new Date(data.ttl) : null;
    const isValid = ttl ? ttl.getTime() > Date.now() : false;
    return NextResponse.json({ cache: data?.cache || null, ttl: data?.ttl || null, valid: isValid, refresh: !isValid });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load personalization', details: e.message }, { status: 500 });
  }
}


