import { createClient } from '@/lib/supabase/client';

/**
 * Track user interaction events for intelligence layer
 */
type TrackedEventType =
  | 'view'
  | 'click'
  | 'save'
  | 'search'
  | 'feedback'
  | 'preference_toggle'
  | 'quick_action';

export async function trackEvent(event: {
  event_type: TrackedEventType;
  destination_id?: number;
  destination_slug?: string;
  query?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    const engagementScore = (() => {
      switch (event.event_type) {
        case 'save':
          return 5;
        case 'click':
          return 2;
        case 'feedback':
        case 'preference_toggle':
        case 'quick_action':
          return 2;
        default:
          return 1;
      }
    })();

    const shouldPersist = Boolean(
      event.destination_id ||
      event.destination_slug ||
      event.event_type === 'quick_action' ||
      event.event_type === 'preference_toggle' ||
      event.event_type === 'feedback'
    );

    if (!shouldPersist) {
      return;
    }

    // Get destination_id from slug if needed
    let destinationId = event.destination_id ?? null;

    if (!destinationId && event.destination_slug) {
      const { data: dest } = await supabase
        .from('destinations')
        .select('id')
        .eq('slug', event.destination_slug)
        .maybeSingle();

      if (dest) {
        destinationId = dest.id;
      }
    }

    await supabase.from('user_interactions').insert({
      user_id: session.user.id,
      destination_id: destinationId,
      destination_slug: event.destination_slug ?? null,
      interaction_type: event.event_type,
      engagement_score: engagementScore,
      context: event.metadata || {},
    });

    if (destinationId && event.event_type === 'view' && event.destination_slug) {
      await supabase.rpc('increment_views_by_slug', {
        dest_slug: event.destination_slug
      });
    }

    if (destinationId && event.event_type === 'save' && event.destination_slug) {
      await supabase.rpc('increment_saves', {
        dest_slug: event.destination_slug
      });
    }
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error('Analytics tracking error:', error);
  }
}

