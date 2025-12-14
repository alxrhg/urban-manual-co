import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, createSuccessResponse, CustomError, ErrorCode } from '@/lib/errors';

export const GET = withAuth(async (
  _req: NextRequest,
  { user },
  context: { params: Promise<{ user_id: string }> }
) => {
  const { user_id } = await context.params;
  const supabase = await createServerClient();

  // Ensure user can only access their own personalization data
  if (user.id !== user_id) {
    throw new CustomError(
      ErrorCode.FORBIDDEN,
      'You can only access your own personalization data',
      403
    );
  }

  // Check cache first
  const { data: cached } = await supabase
    .from('personalization_scores')
    .select('cache, ttl')
    .eq('user_id', user_id)
    .eq('cache_key', 'for_you_feed')
    .gt('ttl', new Date().toISOString())
    .maybeSingle();

  if (cached?.cache && cached.cache.destinations) {
    return createSuccessResponse({
      results: cached.cache.destinations,
      source: 'cache',
    });
  }

  // Get user's saved/visited destinations
  let savedPlaces: any = { data: null };
  let visitedPlaces: any = { data: null };

  try {
    const savedResult = await supabase.rpc('get_user_saved_destinations', { target_user_id: user_id });
    savedPlaces = savedResult;
  } catch (error) {
    console.error('Error fetching saved places:', error);
  }

  try {
    const visitedResult = await supabase.rpc('get_user_visited_destinations', { target_user_id: user_id });
    visitedPlaces = visitedResult;
  } catch (error) {
    console.error('Error fetching visited places:', error);
  }

  const userDestinationIds = new Set([
    ...((savedPlaces?.data || []) as any[]).map((p: any) => p.id),
    ...((visitedPlaces?.data || []) as any[]).map((p: any) => p.id),
  ]);

  if (userDestinationIds.size === 0) {
    // New user: return trending
    const { data: trending } = await supabase
      .from('destinations')
      .select('*')
      .order('trending_score', { ascending: false })
      .limit(10);

    return createSuccessResponse({
      results: trending || [],
      source: 'trending',
      message: 'Start saving places to get personalized recommendations',
    });
  }

  // Get similar destinations to user's saved/visited places
  const destinationIds = Array.from(userDestinationIds);

  const { data: recommendations } = await supabase
    .from('destination_relationships')
    .select(`
      destination_b,
      similarity_score,
      destinations!destination_relationships_destination_b_fkey (*)
    `)
    .in('destination_a', destinationIds)
    .eq('relation_type', 'similar')
    .order('similarity_score', { ascending: false })
    .limit(20);

  // Extract unique destinations
  const destinationMap = new Map<number, any>();
  (recommendations || []).forEach((r: any) => {
    if (r.destinations?.id) {
      destinationMap.set(r.destinations.id, r.destinations);
    }
  });
  const uniqueDestinations = Array.from(destinationMap.values());

  // Cache for 1 hour
  await supabase
    .from('personalization_scores')
    .upsert({
      user_id,
      cache_key: 'for_you_feed',
      cache: { destinations: uniqueDestinations },
      ttl: new Date(Date.now() + 3600000).toISOString(),
    }, {
      onConflict: 'user_id,cache_key',
    });

  return createSuccessResponse({
    results: uniqueDestinations,
    source: 'personalized',
  });
});
