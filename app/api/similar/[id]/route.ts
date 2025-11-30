import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

// Cache for 10 minutes - similar destinations are relatively stable
export const revalidate = 600;

export const GET = withErrorHandling(async (
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const destinationId = parseInt(id);

  if (isNaN(destinationId)) {
    throw createValidationError('Invalid destination ID');
  }

  const supabase = await createServerClient();

  // Get similar and complementary places in parallel
  const [{ data: similar }, { data: complementary }] = await Promise.all([
    supabase
      .from('destination_relationships')
      .select(`
        destination_b,
        similarity_score,
        destinations!destination_relationships_destination_b_fkey (*)
      `)
      .eq('destination_a', destinationId)
      .eq('relation_type', 'similar')
      .gte('similarity_score', 0.75)
      .order('similarity_score', { ascending: false })
      .limit(5),
    supabase
      .from('destination_relationships')
      .select(`
        destination_b,
        similarity_score,
        destinations!destination_relationships_destination_b_fkey (*)
      `)
      .eq('destination_a', destinationId)
      .eq('relation_type', 'complementary')
      .order('similarity_score', { ascending: false })
      .limit(5),
  ]);

  return NextResponse.json({
    similar: (similar || []).map((s: any) => ({
      ...s.destinations,
      match_score: s.similarity_score,
      label: 'Similar Vibe',
    })),
    complementary: (complementary || []).map((c: any) => ({
      ...c.destinations,
      match_score: c.similarity_score,
      label: 'Pair With',
    })),
  });
});
