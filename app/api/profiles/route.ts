/**
 * User profiles API
 * GET /api/profiles - Get profiles (with filters)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServerClient();

  let query = supabase
    .from('user_profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      location,
      travel_style,
      is_public,
      created_at
    `)
    .eq('is_public', true);

  if (username) {
    query = query.eq('username', username);
  }

  if (search) {
    query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: profiles, error } = await query;

  if (error) {
    return NextResponse.json({ profiles: [], error: 'Failed to fetch profiles' }, { status: 500 });
  }

  // Get follower counts
  const profileIds = profiles?.map((p) => p.id) || [];

  if (profileIds.length > 0) {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('user_id, followers_count, following_count')
      .in('user_id', profileIds);

    const statsMap = new Map(stats?.map((s) => [s.user_id, s]) || []);

    // Check if current user follows these profiles
    let followingSet = new Set<string>();
    if (user) {
      const { data: following } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', profileIds);

      followingSet = new Set(following?.map((f) => f.following_id) || []);
    }

    const enrichedProfiles = profiles?.map((profile) => ({
      ...profile,
      followers_count: statsMap.get(profile.id)?.followers_count || 0,
      following_count: statsMap.get(profile.id)?.following_count || 0,
      is_following: followingSet.has(profile.id),
    }));

    return NextResponse.json({ profiles: enrichedProfiles });
  }

  return NextResponse.json({ profiles: profiles || [] });
});
