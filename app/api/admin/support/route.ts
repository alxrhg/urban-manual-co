import { NextResponse } from 'next/server';
import { adminGuard } from '@/middlewares/adminGuard';
import type { AdminRole } from '@/lib/auth';

const ALLOWED_ROLES: AdminRole[] = ['admin', 'support', 'moderator'];

type SupportAction = 'assign' | 'close' | 'reopen' | 'escalate' | 'update_priority';

interface SupportPayload {
  ids: Array<number | string>;
  action: SupportAction;
  assigneeId?: string;
  notes?: string;
  priority?: string;
}

function resolveStatus(action: SupportAction) {
  switch (action) {
    case 'close':
      return 'closed';
    case 'reopen':
      return 'open';
    case 'escalate':
      return 'escalated';
    default:
      return undefined;
  }
}

export async function POST(request: Request) {
  const guard = await adminGuard(request, ALLOWED_ROLES);
  if ('response' in guard) {
    return guard.response;
  }

  const { serviceClient, user } = guard.context;

  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Service role client unavailable' },
      { status: 503 }
    );
  }

  let payload: SupportPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.ids || payload.ids.length === 0) {
    return NextResponse.json({ error: 'No ticket ids provided' }, { status: 400 });
  }

  try {
    const updates: Record<string, unknown> = {
      last_activity_at: new Date().toISOString(),
      last_activity_by: user.id,
    };

    const status = resolveStatus(payload.action);
    if (status) {
      updates.status = status;
    }

    if (payload.action === 'assign' && payload.assigneeId) {
      updates.assigned_to = payload.assigneeId;
    }

    if (payload.action === 'escalate') {
      updates.escalated = true;
    }

    if (payload.action === 'update_priority' && payload.priority) {
      updates.priority = payload.priority;
    }

    if (payload.notes) {
      updates.internal_notes = payload.notes;
    }

    const { error } = await serviceClient
      .from('support_tickets')
      .update(updates)
      .in('id', payload.ids);

    if (error) {
      if (error.code === 'PGRST301' || error.code === '42P01') {
        return NextResponse.json(
          { error: 'Support ticket system is not configured in Supabase.' },
          { status: 501 }
        );
      }

      console.error('[Admin Support] Update failed', error);
      return NextResponse.json(
        { error: 'Failed to update support tickets', details: error.message },
        { status: 500 }
      );
    }

    await serviceClient
      .from('support_ticket_activity')
      .insert({
        ticket_ids: payload.ids,
        actor_id: user.id,
        action: payload.action,
        notes: payload.notes ?? null,
        metadata: {
          priority: payload.priority ?? null,
          assigneeId: payload.assigneeId ?? null,
        },
      })
      .catch(insertError => {
        if (insertError && insertError.code !== '42P01' && insertError.code !== 'PGRST301') {
          console.warn('[Admin Support] Failed to insert activity log', insertError);
        }
      });

    return NextResponse.json({ success: true, updated: payload.ids.length });
  } catch (error) {
    console.error('[Admin Support] Unexpected error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
