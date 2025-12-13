import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createSuccessResponse } from '@/lib/errors';

export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ city: string }> }
) => {
  const supabase = await createServerClient();
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

  return createSuccessResponse({ items: data || [] });
});
