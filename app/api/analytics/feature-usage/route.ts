import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/analytics/feature-usage
 * Track feature usage analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { feature, action, metadata } = body;

    if (!feature || typeof feature !== 'string') {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Allow anonymous tracking
      return NextResponse.json({ success: true, tracked: false });
    }

    // Track feature usage
    try {
      await supabase.from('feature_usage').insert({
        user_id: user.id,
        feature_name: feature,
        action: action || 'used',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error: any) {
      // If table doesn't exist or insert fails, silently continue
      // Analytics should not break the app
      console.debug('[Feature Usage] Tracking failed (non-critical):', error?.message);
    }

    return NextResponse.json({ success: true, tracked: true });
  } catch (error: any) {
    // Silently fail - analytics should not break the app
    return NextResponse.json({ success: true, tracked: false });
  }
}

/**
 * GET /api/analytics/feature-usage
 * Get feature usage statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get feature usage stats
    const { data, error } = await supabase
      .from('feature_usage')
      .select('feature_name, action, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch feature usage', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch feature usage', details: error.message },
      { status: 500 }
    );
  }
}

