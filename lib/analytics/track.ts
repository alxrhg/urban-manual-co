import { createClient } from '@/lib/supabase/client';
import { logPersonalizationMetric } from '@/lib/analytics/personalizationMetrics';

type TrackEventMetadata = Record<string, unknown> & {
  category?: string;
  city?: string;
  source?: string;
  surface?: string;
  experimentKey?: string;
  variation?: string;
  recommendationId?: string;
  dwellTimeMs?: number;
};

/**
 * Track user interaction events for intelligence layer
 */
export async function trackEvent(event: {
  event_type: 'view' | 'click' | 'save' | 'search';
  destination_id?: number;
  destination_slug?: string;
  query?: string;
  metadata?: TrackEventMetadata;
}) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    // Track user interaction
    if (event.destination_id || event.destination_slug) {
      // Get destination_id from slug if needed
      let destinationId = event.destination_id;

      if (!destinationId && event.destination_slug) {
        const { data: dest } = await supabase
          .from('destinations')
          .select('id')
          .eq('slug', event.destination_slug)
          .single();
        
        if (dest) {
          destinationId = dest.id;
        }
      }

      if (destinationId) {
        // Insert interaction
        await supabase.from('user_interactions').insert({
          user_id: session.user.id,
          destination_id: destinationId,
          interaction_type: event.event_type,
          engagement_score: event.event_type === 'save' ? 5 : 
                          event.event_type === 'click' ? 2 : 1,
          context: event.metadata || {},
        });

        // Update destination counters
        if (event.event_type === 'view' && event.destination_slug) {
          await supabase.rpc('increment_views_by_slug', {
            dest_slug: event.destination_slug
          });
        }

        if (event.event_type === 'save' && event.destination_slug) {
          await supabase.rpc('increment_saves', {
            dest_slug: event.destination_slug
          });
        }

        const hasMetrics =
          event.event_type === 'click' ||
          (event.metadata && typeof event.metadata.dwellTimeMs === 'number');

        if (hasMetrics) {
          await logPersonalizationMetric({
            userId: session.user.id,
            destinationId,
            destinationSlug: event.destination_slug,
            surface:
              event.metadata?.surface ||
              event.metadata?.source ||
              'unknown',
            experimentKey: event.metadata?.experimentKey,
            variation: event.metadata?.variation,
            recommendationId: event.metadata?.recommendationId,
            clickThrough: event.event_type === 'click',
            dwellTimeMs: event.metadata?.dwellTimeMs ?? null,
            payload: {
              ...(event.metadata ?? {}),
              eventType: event.event_type,
            },
          });
        }
      }
    }
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error('Analytics tracking error:', error);
  }
}

