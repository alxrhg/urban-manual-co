import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withOptionalAuth, OptionalAuthContext, createSuccessResponse, createValidationError } from '@/lib/errors';

/**
 * GET /api/brands/[brand]
 * Get all destinations for a specific brand
 */
export const GET = withOptionalAuth(async (
  _req: NextRequest,
  { user }: OptionalAuthContext,
  context: { params: Promise<{ brand: string }> }
) => {
  const { brand } = await context.params;

  if (!brand) {
    throw createValidationError('Brand parameter is required');
  }

  const supabase = await createServerClient();

  // Get all destinations for this brand
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('*')
    .ilike('brand', brand)
    .order('rating', { ascending: false, nullsFirst: false });

  if (error) throw error;

  // Get user's saved/visited status for these destinations if authenticated
  const userStatuses: Map<string, any> = new Map();

  if (user && destinations) {
    const slugs = (destinations as any[]).map((d: any) => d.slug);

    const [{ data: savedPlaces }, { data: visitedPlaces }] = await Promise.all([
      supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id)
        .in('destination_slug', slugs),
      supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id)
        .in('destination_slug', slugs),
    ]);

    const savedSet = new Set((savedPlaces as any[])?.map((s: any) => s.destination_slug) || []);
    const visitedSet = new Set((visitedPlaces as any[])?.map((v: any) => v.destination_slug) || []);

    (destinations as any[]).forEach((dest: any) => {
      userStatuses.set(dest.slug, {
        is_saved: savedSet.has(dest.slug),
        is_visited: visitedSet.has(dest.slug),
      });
    });
  }

  return createSuccessResponse({
    brand,
    count: destinations?.length || 0,
    destinations: (destinations as any[])?.map((d: any) => ({
      ...d,
      user_status: user ? userStatuses.get(d.slug) : undefined,
    })) || [],
  });
});
