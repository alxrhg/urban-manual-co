/**
 * Greeting Context API
 * GET /api/greeting/context
 *
 * Returns enriched greeting context for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchGreetingContext } from '@/lib/greetings/context-fetcher';

// Mark route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const favoriteCity = searchParams.get('favoriteCity') || undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the caller is authenticated and owns the requested userId
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only allow users to fetch their own greeting context
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch enriched greeting context
    const context = await fetchGreetingContext(userId, favoriteCity);

    return NextResponse.json({
      success: true,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching greeting context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cache for 5 minutes
export const revalidate = 300;
