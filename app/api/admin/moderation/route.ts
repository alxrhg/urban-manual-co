import { NextResponse } from 'next/server';
import { adminGuard } from '@/middlewares/adminGuard';
import type { AdminRole } from '@/lib/auth';

const ALLOWED_ROLES: AdminRole[] = ['admin', 'moderator'];

interface ModerationPayload {
  ids: Array<number | string>;
  action: 'approve' | 'reject' | 'flag' | 'reset';
  notes?: string;
}

function mapActionToState(action: ModerationPayload['action']) {
  switch (action) {
    case 'approve':
      return 'approved';
    case 'reject':
      return 'rejected';
    case 'flag':
      return 'flagged';
    case 'reset':
      return 'pending';
    default:
      return null;
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

  let payload: ModerationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.ids || payload.ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }

  const moderationState = mapActionToState(payload.action);
  if (!moderationState) {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  try {
    const update = {
      moderation_state: moderationState,
      moderation_notes: payload.notes ?? null,
      moderation_updated_at: new Date().toISOString(),
      moderation_updated_by: user.id,
    };

    const { error } = await serviceClient
      .from('destinations')
      .update(update)
      .in('id', payload.ids);

    if (error) {
      if (error.code === 'PGRST301' || error.code === '42P01') {
        return NextResponse.json(
          { error: 'Destinations moderation metadata is not configured in Supabase.' },
          { status: 501 }
        );
      }

      console.error('[Admin Moderation] Update failed', error);
      return NextResponse.json(
        { error: 'Failed to update moderation state', details: error.message },
        { status: 500 }
      );
    }

    const { error: insertError } = await serviceClient
      .from('moderation_actions')
      .insert({
        actor_id: user.id,
        action: moderationState,
        notes: payload.notes ?? null,
        destination_ids: payload.ids,
      });

    if (insertError && insertError.code !== '42P01' && insertError.code !== 'PGRST301') {
      console.warn('[Admin Moderation] Failed to record audit trail', insertError);
    }

    return NextResponse.json({ success: true, updated: payload.ids.length });
  } catch (error) {
    console.error('[Admin Moderation] Unexpected error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
