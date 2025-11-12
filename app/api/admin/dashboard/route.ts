import { NextResponse } from 'next/server';
import type { PostgrestError, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { adminGuard } from '@/middlewares/adminGuard';
import type { AdminRole } from '@/lib/auth';

const ALLOWED_ROLES: AdminRole[] = ['admin', 'editor', 'moderator', 'support'];

interface SafeCountResult {
  count: number;
  error?: PostgrestError | Error;
  unavailable?: boolean;
}

async function safeCount(
  builder: PostgrestFilterBuilder<any, any, any>
): Promise<SafeCountResult> {
  try {
    const { count, error } = await builder;
    if (error) {
      if (error.code === 'PGRST301' || error.code === '42P01') {
        return { count: 0, error, unavailable: true };
      }
      console.error('[Admin Dashboard] Count error', error);
      return { count: 0, error };
    }
    return { count: count ?? 0 };
  } catch (error) {
    console.error('[Admin Dashboard] Count threw', error);
    return { count: 0, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

async function safeSelect<T>(
  builder: PostgrestFilterBuilder<T, any, any>
): Promise<{ data: T[]; error?: PostgrestError | Error; unavailable?: boolean }> {
  try {
    const { data, error } = await builder;
    if (error) {
      if (error.code === 'PGRST301' || error.code === '42P01') {
        return { data: [], error, unavailable: true };
      }
      console.error('[Admin Dashboard] Select error', error);
      return { data: [], error };
    }
    return { data: data ?? [] };
  } catch (error) {
    console.error('[Admin Dashboard] Select threw', error);
    return { data: [], error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export async function GET(request: Request) {
  const guard = await adminGuard(request, ALLOWED_ROLES);
  if ('response' in guard) {
    return guard.response;
  }

  const { serviceClient } = guard.context;

  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Service role client is not configured.' },
      { status: 503 }
    );
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime());
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now.getTime());
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const datasets = {
    users: await safeCount(
      serviceClient
        .from('user_profiles')
        .select('*', { head: true, count: 'exact' })
    ),
    newUsers: await safeCount(
      serviceClient
        .from('user_profiles')
        .select('*', { head: true, count: 'exact' })
        .gte('created_at', oneWeekAgo.toISOString())
    ),
    activeUsers: await safeCount(
      serviceClient
        .from('user_interactions')
        .select('*', { head: true, count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString())
        .neq('interaction_type', 'system')
    ),
    destinations: await safeCount(
      serviceClient
        .from('destinations')
        .select('*', { head: true, count: 'exact' })
    ),
    destinationsNeedingReview: await safeCount(
      serviceClient
        .from('destinations')
        .select('*', { head: true, count: 'exact' })
        .or('moderation_state.eq.pending,moderation_state.eq.flagged,google_place_id.is.null')
    ),
    totalInteractions: await safeCount(
      serviceClient
        .from('user_interactions')
        .select('*', { head: true, count: 'exact' })
    ),
    searchInteractions: await safeCount(
      serviceClient
        .from('user_interactions')
        .select('*', { head: true, count: 'exact' })
        .eq('interaction_type', 'search')
    ),
    recentSearchInteractions: await safeCount(
      serviceClient
        .from('user_interactions')
        .select('*', { head: true, count: 'exact' })
        .eq('interaction_type', 'search')
        .gte('created_at', oneWeekAgo.toISOString())
    ),
  };

  const moderationSelect = await safeSelect(
    serviceClient
      .from('destinations')
      .select(
        'id, slug, name, city, category, moderation_state, flagged_reason, google_place_id, updated_at, created_at'
      )
      .order('updated_at', { ascending: false })
      .limit(40)
  );

  const moderationQueue = moderationSelect.data
    .filter(item => {
      if (item.moderation_state && item.moderation_state !== 'approved') {
        return true;
      }
      if (!item.google_place_id) {
        return true;
      }
      return false;
    })
    .map(item => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      city: item.city,
      category: item.category,
      status: item.moderation_state ?? (!item.google_place_id ? 'needs_enrichment' : 'approved'),
      flaggedReason: item.flagged_reason ?? null,
      updatedAt: item.updated_at ?? item.created_at ?? null,
    }));

  const supportTickets = await safeSelect(
    serviceClient
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40)
  );

  const latestInteraction = await safeSelect(
    serviceClient
      .from('user_interactions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
  );

  const latestDestinationUpdate = await safeSelect(
    serviceClient
      .from('destinations')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
  );

  const discoveryEngineEnabled = Boolean(
    process.env.GOOGLE_DISCOVERY_ENGINE_DATA_STORE_ID &&
      process.env.GOOGLE_DISCOVERY_ENGINE_COLLECTION_ID
  );

  const responsePayload = {
    datasets: [
      {
        key: 'users',
        label: 'Users',
        available: !datasets.users.unavailable,
        total: datasets.users.count,
        newThisWeek: datasets.newUsers.count,
        active30d: datasets.activeUsers.count,
        description: 'Profiles, personalization inputs, and admin roles stored in user_profiles.',
      },
      {
        key: 'content',
        label: 'Content Library',
        available: !datasets.destinations.unavailable,
        total: datasets.destinations.count,
        pending: datasets.destinationsNeedingReview.count,
        description: 'Destinations, enrichment status, and moderation flags.',
      },
      {
        key: 'analytics',
        label: 'Engagement Analytics',
        available: !datasets.totalInteractions.unavailable,
        totalEvents: datasets.totalInteractions.count,
        searches: datasets.searchInteractions.count,
        searchesLastWeek: datasets.recentSearchInteractions.count,
        discoveryEngineEnabled,
        description: 'user_interactions table capturing searches, saves, and engagements.',
      },
    ],
    moderation: {
      items: moderationQueue,
      unavailable: moderationSelect.unavailable ?? false,
    },
    support: {
      items: supportTickets.data.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject ?? ticket.title ?? 'Support Request',
        status: ticket.status ?? 'open',
        priority: ticket.priority ?? 'normal',
        createdAt: ticket.created_at ?? null,
        updatedAt: ticket.updated_at ?? ticket.last_activity_at ?? null,
        assignedTo: ticket.assigned_to ?? null,
        payload: ticket,
      })),
      unavailable: supportTickets.unavailable ?? false,
    },
    systemStatus: {
      supabaseConfigured: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
      ),
      lastAnalyticsEvent: latestInteraction.data[0]?.created_at ?? null,
      lastContentUpdate: latestDestinationUpdate.data[0]?.updated_at ?? null,
      datasetsUnavailable: Object.entries(datasets)
        .filter(([, result]) => result.unavailable)
        .map(([key]) => key),
    },
  };

  return NextResponse.json(responsePayload);
}
