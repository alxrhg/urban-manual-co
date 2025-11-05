/**
 * API Route: Get Personalized Feed
 * GET /api/feed/for-you
 */

import { NextRequest, NextResponse } from 'next/server';
import { feedGenerationService } from '@/services/feed/feed-generation';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Generate feed
    const feed = await feedGenerationService.generateFeed(
      user.id,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      feed,
      count: feed.length,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('Error in /api/feed/for-you:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
