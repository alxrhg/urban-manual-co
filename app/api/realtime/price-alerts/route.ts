import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, createSuccessResponse, createValidationError, AuthContext } from '@/lib/errors';

/**
 * API endpoint for price alerts
 * POST /api/realtime/price-alerts
 *
 * Create or update price alerts for destinations
 */
export const POST = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const body = await request.json();
  const { destination_id, alert_type, threshold_value } = body;

  if (!destination_id || !alert_type) {
    throw createValidationError('Missing required fields: destination_id, alert_type');
  }

  const supabase = await createServerClient();

  // Check if alert already exists
  const { data: existing } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('destination_id', destination_id)
    .eq('alert_type', alert_type)
    .eq('is_active', true)
    .single();

  if (existing) {
    // Update existing alert
    const { error: updateError } = await supabase
      .from('price_alerts')
      .update({
        threshold_value,
        is_active: true,
      })
      .eq('id', existing.id);

    if (updateError) {
      throw updateError;
    }

    return createSuccessResponse({
      success: true,
      action: 'updated',
      alert_id: existing.id,
    });
  } else {
    // Create new alert
    const { data: newAlert, error: insertError } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user.id,
        destination_id,
        alert_type,
        threshold_value,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return createSuccessResponse({
      success: true,
      action: 'created',
      alert_id: newAlert.id,
    });
  }
});

/**
 * GET /api/realtime/price-alerts
 * Get active price alerts for the authenticated user
 */
export const GET = withAuth(async (_request: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select('*, destinations(id, name, slug, city)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return createSuccessResponse({
    alerts: alerts || [],
    count: alerts?.length || 0,
  });
});

/**
 * DELETE /api/realtime/price-alerts?alert_id=xxx
 * Deactivate a price alert
 */
export const DELETE = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const { searchParams } = new URL(request.url);
  const alertId = searchParams.get('alert_id');

  if (!alertId) {
    throw createValidationError('alert_id is required');
  }

  const supabase = await createServerClient();

  // Verify the alert belongs to the user before deactivating
  const { data: alert } = await supabase
    .from('price_alerts')
    .select('user_id')
    .eq('id', alertId)
    .single();

  if (!alert || alert.user_id !== user.id) {
    throw createValidationError('Alert not found or does not belong to user');
  }

  const { error } = await supabase
    .from('price_alerts')
    .update({ is_active: false })
    .eq('id', alertId);

  if (error) {
    throw error;
  }

  return createSuccessResponse({
    success: true,
    message: 'Alert deactivated',
  });
});

