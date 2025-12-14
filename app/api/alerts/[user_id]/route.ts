import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth, AuthContext, createSuccessResponse, createValidationError } from '@/lib/errors';

export const GET = withAuth(async (
  _req: NextRequest,
  { user }: AuthContext,
  context: { params: Promise<{ user_id: string }> }
) => {
  const { user_id } = await context.params;

  // Security: verify the user_id matches the authenticated user
  if (user_id !== user.id) {
    throw createValidationError('Unauthorized access to alerts');
  }

  const supabase = await createServerClient();

  const { data: alerts, error } = await supabase
    .from('opportunity_alerts')
    .select(`
      *,
      destinations (
        id, slug, name, city, image
      )
    `)
    .eq('user_id', user_id)
    .eq('read', false)
    .order('triggered_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  return createSuccessResponse({
    alerts: (alerts || []).map((a: any) => ({
      id: a.id,
      type: a.alert_type,
      severity: a.severity,
      destination: a.destinations,
      message: a.message,
      triggered_at: a.triggered_at,
    })),
  });
});

export const PATCH = withAuth(async (
  request: NextRequest,
  { user }: AuthContext,
  context: { params: Promise<{ user_id: string }> }
) => {
  const { user_id } = await context.params;

  // Security: verify the user_id matches the authenticated user
  if (user_id !== user.id) {
    throw createValidationError('Unauthorized access to alerts');
  }

  const { alertId } = await request.json();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('opportunity_alerts')
    .update({ read: true })
    .eq('id', alertId)
    .eq('user_id', user_id);

  if (error) throw error;

  return createSuccessResponse({ success: true });
});


