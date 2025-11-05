import { NextRequest, NextResponse } from 'next/server';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destinationId = parseInt(searchParams.get('destination_id') || '0');

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    // Get user if authenticated
    const authHeader = request.headers.get('authorization');
    let userId: string | undefined;

    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (e) {
        // Ignore auth errors
      }
    }

    // Fetch real-time status
    const status = await realtimeIntelligenceService.getRealtimeStatus(
      destinationId,
      userId
    );

    return NextResponse.json({
      destinationId,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching realtime status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime status', details: error.message },
      { status: 500 }
    );
  }
}
