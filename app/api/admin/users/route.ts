import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = (user.app_metadata as Record<string, unknown>)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    // Use service role client to access auth.users
    const adminClient = createServiceRoleClient();

    // Fetch users from auth.users
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (authError) {
      console.error('Failed to fetch users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get activity data for these users
    const userIds = authData.users.map(u => u.id);

    const [savedPlacesResult, visitedPlacesResult] = await Promise.all([
      adminClient.from('saved_places').select('user_id').in('user_id', userIds),
      adminClient.from('visited_places').select('user_id').in('user_id', userIds),
    ]);

    // Count activity per user
    const userSaves: Record<string, number> = {};
    const userVisits: Record<string, number> = {};

    savedPlacesResult.data?.forEach(sp => {
      userSaves[sp.user_id] = (userSaves[sp.user_id] || 0) + 1;
    });

    visitedPlacesResult.data?.forEach(vp => {
      userVisits[vp.user_id] = (userVisits[vp.user_id] || 0) + 1;
    });

    // Transform user data
    let users = authData.users.map(authUser => ({
      id: authUser.id,
      email: authUser.email || '',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      app_metadata: authUser.app_metadata || {},
      user_metadata: authUser.user_metadata || {},
      saved_count: userSaves[authUser.id] || 0,
      visited_count: userVisits[authUser.id] || 0,
    }));

    // Apply search filter
    if (search) {
      const query = search.toLowerCase();
      users = users.filter(u =>
        u.email.toLowerCase().includes(query) ||
        (u.user_metadata?.full_name as string || '').toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (role) {
      users = users.filter(u => u.app_metadata?.role === role);
    }

    // Calculate stats
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalUsers: authData.users.length,
      activeUsers: authData.users.filter(u =>
        u.last_sign_in_at && new Date(u.last_sign_in_at) > weekAgo
      ).length,
      newUsersThisMonth: authData.users.filter(u =>
        new Date(u.created_at) > monthAgo
      ).length,
      adminUsers: authData.users.filter(u => u.app_metadata?.role === 'admin').length,
    };

    return NextResponse.json({
      users,
      stats,
      total: users.length,
      page,
      limit,
    });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
