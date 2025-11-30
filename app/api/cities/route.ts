import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandling } from '@/lib/errors';

// Cache for 5 minutes - cities rarely change
export const revalidate = 300;

export const GET = withErrorHandling(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query distinct cities from the destinations table
  const { data, error } = await supabase
    .from('destinations')
    .select('city')
    .not('city', 'is', null)
    .order('city');

  if (error) {
    throw error;
  }

  // Extract unique cities
  const cities = [...new Set(data.map((d: { city: string }) => d.city))].sort();

  return NextResponse.json({ cities });
});
