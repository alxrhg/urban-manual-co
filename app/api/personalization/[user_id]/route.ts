import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { createServerClient } from '@/lib/supabase-server';

type PersonalizationHandlerDeps = {
  createClient?: () => Promise<SupabaseClient>;
};

function isAdmin(user: User | null): boolean {
  if (!user) {
    return false;
  }

  const role = (user.app_metadata as Record<string, any> | null)?.role;
  return role === 'admin';
}

export function createPersonalizationHandler(deps: PersonalizationHandlerDeps = {}) {
  const getClient = deps.createClient ?? createServerClient;

  return async function GET(
    _req: NextRequest,
    context: { params: Promise<{ user_id: string }> }
  ) {
    try {
      const supabase = await getClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Personalization auth error:', authError);
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized: no active session' },
          { status: 401 }
        );
      }

      const { user_id: requestedUserId } = await context.params;
      const admin = isAdmin(user);

      if (!admin && user.id !== requestedUserId) {
        return NextResponse.json(
          { error: 'Forbidden: cannot access another user\'s personalization' },
          { status: 403 }
        );
      }

      const targetUserId = requestedUserId;

      // Check cache first
      const { data: cached } = await supabase
        .from('personalization_scores')
        .select('cache, ttl')
        .eq('user_id', targetUserId)
        .eq('cache_key', 'for_you_feed')
        .gt('ttl', new Date().toISOString())
        .maybeSingle();

      if (cached?.cache && cached.cache.destinations) {
        return NextResponse.json({
          results: cached.cache.destinations,
          source: 'cache',
        });
      }

      // Get user's saved/visited destinations
      let savedPlaces: any = { data: null };
      let visitedPlaces: any = { data: null };

      try {
        const savedResult = await supabase.rpc('get_user_saved_destinations', {
          target_user_id: targetUserId,
        });
        savedPlaces = savedResult;
      } catch (error) {
        console.error('Error fetching saved places:', error);
      }

      try {
        const visitedResult = await supabase.rpc('get_user_visited_destinations', {
          target_user_id: targetUserId,
        });
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

        return NextResponse.json({
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
        .upsert(
          {
            user_id: targetUserId,
            cache_key: 'for_you_feed',
            cache: { destinations: uniqueDestinations },
            ttl: new Date(Date.now() + 3600000).toISOString(),
          },
          {
            onConflict: 'user_id,cache_key',
          }
        );

      return NextResponse.json({
        results: uniqueDestinations,
        source: 'personalized',
      });
    } catch (e: any) {
      console.error('Personalization error:', e);
      return NextResponse.json(
        { error: 'Failed to load personalization', details: e.message },
        { status: 500 }
      );
    }
  };
}

export const GET = createPersonalizationHandler();
