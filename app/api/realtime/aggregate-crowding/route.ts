import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * API endpoint to aggregate and update crowding data from multiple sources
 * POST /api/realtime/aggregate-crowding
 * 
 * This endpoint can be called by:
 * - Cron jobs that fetch Google Popular Times data
 * - Background workers that aggregate user reports
 * - Manual admin updates
 * 
 * Body:
 * {
 *   destination_id: number;
 *   day_of_week: number; // 0-6 (Sunday-Saturday)
 *   hour_of_day: number; // 0-23
 *   crowding_level: 'quiet' | 'moderate' | 'busy' | 'very_busy';
 *   crowding_score: number; // 0-100
 *   sample_size?: number; // Number of data points
 *   data_source?: string; // 'google_places', 'user_reports', 'manual'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      destination_id,
      day_of_week,
      hour_of_day,
      crowding_level,
      crowding_score,
      sample_size = 1,
      data_source = 'manual',
    } = body;

    if (
      destination_id === undefined ||
      day_of_week === undefined ||
      hour_of_day === undefined ||
      !crowding_level ||
      crowding_score === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check if record exists
    const { data: existing } = await supabase
      .from('crowding_data')
      .select('*')
      .eq('destination_id', destination_id)
      .eq('day_of_week', day_of_week)
      .eq('hour_of_day', hour_of_day)
      .single();

    if (existing) {
      // Update existing record with weighted average
      const newSampleSize = existing.sample_size + sample_size;
      const weightedScore = Math.round(
        (existing.crowding_score * existing.sample_size + crowding_score * sample_size) /
        newSampleSize
      );

      const { error: updateError } = await supabase
        .from('crowding_data')
        .update({
          crowding_level,
          crowding_score: weightedScore,
          sample_size: newSampleSize,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating crowding data:', updateError);
        return NextResponse.json(
          { error: 'Failed to update crowding data', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        crowding_score: weightedScore,
        sample_size: newSampleSize,
      });
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('crowding_data')
        .insert({
          destination_id,
          day_of_week,
          hour_of_day,
          crowding_level,
          crowding_score,
          sample_size,
        });

      if (insertError) {
        console.error('Error inserting crowding data:', insertError);
        return NextResponse.json(
          { error: 'Failed to insert crowding data', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        crowding_score,
        sample_size,
      });
    }
  } catch (error: any) {
    console.error('Error in aggregate crowding API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/realtime/aggregate-crowding?destination_id=123&day_of_week=1&hour_of_day=14
 * Get crowding data for a specific destination, day, and hour
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destinationId = parseInt(searchParams.get('destination_id') || '0');
    const dayOfWeek = parseInt(searchParams.get('day_of_week') || '-1');
    const hourOfDay = parseInt(searchParams.get('hour_of_day') || '-1');

    if (!destinationId || destinationId <= 0) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('crowding_data')
      .select('*')
      .eq('destination_id', destinationId);

    if (dayOfWeek >= 0 && dayOfWeek <= 6) {
      query = query.eq('day_of_week', dayOfWeek);
    }

    if (hourOfDay >= 0 && hourOfDay <= 23) {
      query = query.eq('hour_of_day', hourOfDay);
    }

    const { data, error } = await query.order('day_of_week', { ascending: true })
      .order('hour_of_day', { ascending: true });

    if (error) {
      console.error('Error fetching crowding data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch crowding data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      crowding_data: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in aggregate crowding GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

