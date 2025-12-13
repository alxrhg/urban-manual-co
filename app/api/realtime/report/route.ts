import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, withErrorHandling, createSuccessResponse, createValidationError, AuthContext } from '@/lib/errors';

/**
 * API endpoint to submit user-reported real-time data
 * POST /api/realtime/report
 *
 * Body:
 * {
 *   destination_id: number;
 *   report_type: 'wait_time' | 'closed' | 'special_offer';
 *   report_data: {
 *     wait_time?: number; // minutes
 *     message?: string;
 *   };
 * }
 */
export const POST = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const body = await request.json();
  const { destination_id, report_type, report_data } = body;

  if (!destination_id || !report_type || !report_data) {
    throw createValidationError('Missing required fields: destination_id, report_type, report_data');
  }

  const supabase = await createServerClient();

  // Calculate expiration (reports expire after 4 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 4);

  // Insert user report
  const { data: report, error: reportError } = await supabase
    .from('user_reports')
    .insert({
      user_id: user.id,
      destination_id,
      report_type,
      report_data,
      verified: false, // User reports need verification
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (reportError) {
    console.error('Error creating user report:', reportError);
    throw reportError;
  }

  // If report type is wait_time, update destination_status
  if (report_type === 'wait_time' && report_data.wait_time !== undefined) {
    await supabase
      .from('destination_status')
      .insert({
        destination_id,
        status_type: 'wait_time',
        status_value: {
          current: report_data.wait_time,
          trend: 'stable', // Default, can be enhanced later
        },
        data_source: 'user_reported',
        confidence_score: 0.7,
        expires_at: expiresAt.toISOString(),
      });
  }

  return createSuccessResponse({
    success: true,
    report_id: report.id,
    message: 'Report submitted successfully',
  });
});

/**
 * GET /api/realtime/report?destination_id=123
 * Get recent user reports for a destination
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const destinationId = parseInt(searchParams.get('destination_id') || '0');

  if (!destinationId || destinationId <= 0) {
    throw createValidationError('destination_id is required');
  }

  const supabase = await createServerClient();

  // Get verified reports from last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: reports, error } = await supabase
    .from('user_reports')
    .select('*')
    .eq('destination_id', destinationId)
    .eq('verified', true)
    .gte('created_at', fourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }

  return createSuccessResponse({
    reports: reports || [],
    count: reports?.length || 0,
  });
});

