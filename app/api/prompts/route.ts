import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createSuccessResponse } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const archetype = searchParams.get('archetype') || undefined;
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  let q = supabase
    .from('discovery_prompts')
    .select('id, city, category, archetype, variant_a, variant_b, weight')
    .order('weight', { ascending: false })
    .limit(limit);

  if (city) q = q.ilike('city', `%${city}%`).or(`city_id.is.not.null`);
  if (category) q = q.ilike('category', `%${category}%`);
  if (archetype) q = q.ilike('archetype', `%${archetype}%`);

  const { data, error } = await q;
  if (error) throw error;

  // Apply interest_score weighting from forecasting_data
  let weighted = data || [];
  if (city) {
    const { data: forecast } = await supabase
      .from('forecasting_data')
      .select('city, interest_score')
      .ilike('city', `%${city}%`)
      .order('last_forecast', { ascending: false })
      .limit(1);
    const interest = forecast?.[0]?.interest_score || 1.0;
    weighted = weighted.map((p: any) => ({ ...p, weight: (p.weight || 1) * interest }));
  }

  // Choose up to 2 prompts with A/B variant
  const chosen = (weighted)
    .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 2)
    .map((p: any) => ({
      title: p.variant_a || p.variant_b || 'Prompt',
      variant: p.variant_a ? 'A' : (p.variant_b ? 'B' : 'A'),
      city: p.city,
      archetype: p.archetype,
      weight: p.weight,
    }));

  return createSuccessResponse({ items: chosen });
});


