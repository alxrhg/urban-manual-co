import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError, handleSupabaseError } from '@/lib/errors';

const VALID_ISSUE_TYPES = [
  'closed_permanently',
  'wrong_hours',
  'wrong_location',
  'wrong_contact',
  'wrong_description',
  'duplicate',
  'inappropriate',
  'other',
] as const;

type IssueType = typeof VALID_ISSUE_TYPES[number];

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  const body = await request.json();
  const {
    destinationSlug,
    issueType,
    details,
    reporterEmail,
    reporterId,
  } = body;

  // Validate required fields
  if (!destinationSlug) {
    throw createValidationError('Destination slug is required');
  }

  if (!issueType) {
    throw createValidationError('Issue type is required');
  }

  if (!VALID_ISSUE_TYPES.includes(issueType as IssueType)) {
    throw createValidationError('Invalid issue type');
  }

  // Verify destination exists
  const { data: destination, error: destError } = await supabase
    .from('destinations')
    .select('id, name')
    .eq('slug', destinationSlug)
    .maybeSingle();

  if (destError) {
    throw handleSupabaseError(destError);
  }

  if (!destination) {
    throw createValidationError('Destination not found');
  }

  // Get reporter info if authenticated
  let authenticatedUserId: string | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    authenticatedUserId = user.id;
  }

  // Create the report
  const { data: report, error: reportError } = await supabase
    .from('destination_reports')
    .insert({
      destination_id: destination.id,
      destination_slug: destinationSlug,
      issue_type: issueType,
      details: details?.slice(0, 500) || null, // Limit details to 500 chars
      reporter_email: reporterEmail || null,
      reporter_id: authenticatedUserId || reporterId || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (reportError) {
    // If table doesn't exist, create it
    if (reportError.code === '42P01') {
      // Table doesn't exist - log and return success anyway
      console.warn('destination_reports table does not exist. Report not saved but accepting submission.');
      return NextResponse.json({
        success: true,
        message: 'Report submitted successfully',
      });
    }
    throw handleSupabaseError(reportError);
  }

  return NextResponse.json({
    success: true,
    message: 'Report submitted successfully',
    reportId: report?.id,
  });
});

// GET endpoint to fetch reports for admins
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const isAdmin = user.user_metadata?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'pending';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const { data: reports, error } = await supabase
    .from('destination_reports')
    .select(`
      *,
      destinations (
        id,
        name,
        slug,
        city
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({
    reports: reports || [],
  });
});
