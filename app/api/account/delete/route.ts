import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { withErrorHandling, createUnauthorizedError, handleSupabaseError, createValidationError } from '@/lib/errors';

const PENDING_STATUSES = ['pending', 'in_progress'];

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

  const serviceClient = createServiceRoleClient();

  // Check if service client is properly configured
  // If using placeholder, operations will fail
  const serviceClientUrl = (serviceClient as any).supabaseUrl;
  if (serviceClientUrl?.includes('placeholder')) {
    console.error('[Account Delete] Service role client not configured - missing SUPABASE_SERVICE_ROLE_KEY');
    throw createValidationError(
      'Account deletion is temporarily unavailable. Please try again later or contact support.'
    );
  }

  // Prevent duplicate pending requests
  const { data: existingRequest, error: existingError } = await serviceClient
    .from('account_data_requests')
    .select('*')
    .eq('user_id', user.id)
    .eq('request_type', 'deletion')
    .in('status', PENDING_STATUSES)
    .maybeSingle();

  if (existingError) {
    // Log the actual error for debugging
    console.error('[Account Delete] Error checking existing requests:', existingError);

    // Check for table not found error
    if (existingError.code === '42P01' || existingError.message?.includes('does not exist')) {
      throw createValidationError(
        'Account deletion is not yet configured. Please contact support.'
      );
    }

    if (existingError.code !== 'PGRST116') {
      throw handleSupabaseError(existingError);
    }
  }

  if (existingRequest) {
    return NextResponse.json({
      success: true,
      request: existingRequest,
      message: 'A deletion request is already being processed.',
    });
  }

  const { data: newRequest, error: insertError } = await serviceClient
    .from('account_data_requests')
    .insert({
      user_id: user.id,
      request_type: 'deletion',
      status: 'pending',
      payload: reason ? { reason } : null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Account Delete] Error creating deletion request:', insertError);
    throw handleSupabaseError(insertError);
  }

  // Audit log is optional - don't fail if it errors
  try {
    await serviceClient.from('account_privacy_audit').insert({
      user_id: user.id,
      action: 'request_deletion',
      metadata: {
        reason,
        request_id: newRequest.id,
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    });
  } catch (auditError) {
    console.warn('[Account Delete] Failed to create audit log:', auditError);
  }

  return NextResponse.json({
    success: true,
    request: newRequest,
    message: 'Account deletion request queued. You will receive an email once complete.',
  });
});
