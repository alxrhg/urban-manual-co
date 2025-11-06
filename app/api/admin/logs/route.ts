import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const { serviceClient, user } = await requireAdmin(request);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level'); // filter by log level
    const type = searchParams.get('type'); // filter by log type
    const userId = searchParams.get('userId'); // filter by user
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = serviceClient
      .from('logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false });

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch logs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.status || 401 }
    );
  }
}

// Get log statistics
export async function POST(request: NextRequest) {
  try {
    const { serviceClient } = await requireAdmin(request);
    const body = await request.json();
    const { action } = body;

    if (action === 'stats') {
      // Get statistics
      const [
        { count: totalLogs },
        { count: errorCount },
        { count: warnCount },
        { count: securityEvents },
        { count: rateLimitEvents },
      ] = await Promise.all([
        serviceClient.from('logs').select('*', { count: 'exact', head: true }),
        serviceClient.from('logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
        serviceClient.from('logs').select('*', { count: 'exact', head: true }).eq('level', 'warn'),
        serviceClient.from('logs').select('*', { count: 'exact', head: true }).eq('type', 'security'),
        serviceClient.from('logs').select('*', { count: 'exact', head: true }).eq('type', 'rate_limit'),
      ]);

      // Get recent error logs
      const { data: recentErrors } = await serviceClient
        .from('logs')
        .select('*')
        .eq('level', 'error')
        .order('timestamp', { ascending: false })
        .limit(10);

      // Get top users hitting rate limits
      const { data: topRateLimitUsers } = await serviceClient
        .from('logs')
        .select('user_id, context')
        .eq('type', 'rate_limit')
        .not('user_id', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(20);

      // Count by user
      const userCounts: Record<string, number> = {};
      topRateLimitUsers?.forEach((log: any) => {
        if (log.user_id) {
          userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
        }
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return NextResponse.json({
        stats: {
          totalLogs: totalLogs || 0,
          errorCount: errorCount || 0,
          warnCount: warnCount || 0,
          securityEvents: securityEvents || 0,
          rateLimitEvents: rateLimitEvents || 0,
        },
        recentErrors: recentErrors || [],
        topRateLimitUsers: topUsers,
      });
    }

    if (action === 'clear_old') {
      // Clear logs older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await serviceClient
        .from('logs')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        return NextResponse.json(
          { error: 'Failed to clear old logs' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Old logs cleared' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.status || 401 }
    );
  }
}
