import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const VALID_ACTIONS = new Set(['dismiss', 'more_like_this']);

type PreferenceType = 'city' | 'category' | 'style' | 'price' | 'neighborhood';

interface FeedbackPayload {
  destinationId?: number;
  destinationSlug?: string;
  action: 'dismiss' | 'more_like_this';
  reason?: string;
  preferenceType?: PreferenceType;
  preferenceValue?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

function normalize(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as FeedbackPayload;
    const {
      destinationId,
      destinationSlug,
      action,
      reason,
      preferenceType,
      preferenceValue,
      sessionId,
      metadata = {},
    } = payload;

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: 'Invalid feedback action' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required for feedback events' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!destinationId && !destinationSlug) {
      return NextResponse.json(
        { error: 'Destination identifier is required' },
        { status: 400 }
      );
    }

    let resolvedDestinationId = destinationId ?? null;
    let resolvedSlug = normalize(destinationSlug);
    let destinationDetails: {
      id: number;
      slug: string;
      city: string | null;
      category: string | null;
    } | null = null;

    if (!resolvedDestinationId || !resolvedSlug) {
      const query = supabase
        .from('destinations')
        .select('id, slug, city, category')
        .limit(1);

      if (resolvedDestinationId) {
        query.eq('id', resolvedDestinationId);
      } else if (resolvedSlug) {
        query.eq('slug', resolvedSlug);
      }

      const { data: destinationRecord, error } = await query.single();

      if (error || !destinationRecord) {
        return NextResponse.json(
          { error: 'Destination not found' },
          { status: 404 }
        );
      }

      destinationDetails = destinationRecord;
      resolvedDestinationId = destinationRecord.id;
      resolvedSlug = destinationRecord.slug;
    } else {
      destinationDetails = {
        id: resolvedDestinationId,
        slug: resolvedSlug,
        city: null,
        category: null,
      };
    }

    if (!destinationDetails) {
      const { data: destinationRecord } = await supabase
        .from('destinations')
        .select('id, slug, city, category')
        .eq('id', resolvedDestinationId)
        .maybeSingle();

      if (destinationRecord) {
        destinationDetails = destinationRecord;
      }
    }

    const interactionType = action === 'more_like_this'
      ? 'feedback_positive'
      : 'feedback_negative';

    const metadataRecord = metadata as Record<string, unknown>;
    const metadataSource = typeof metadataRecord.source === 'string' ? metadataRecord.source : undefined;
    const metadataContext = typeof metadataRecord.context === 'string' ? metadataRecord.context : undefined;

    const feedbackMetadata = {
      ...metadata,
      action,
      reason,
      preferenceType,
      preferenceValue,
      experimentVariant: request.headers.get('x-experiment-variant') || undefined,
      source: metadataSource ?? 'smart_recommendations',
    };

    const interactionInsert = supabase
      .from('user_interactions')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        interaction_type: interactionType,
        destination_slug: resolvedSlug,
        city: destinationDetails?.city ?? null,
        category: destinationDetails?.category ?? null,
        metadata: feedbackMetadata,
      });

    const normalizedPreferenceType = preferenceType ?? (destinationDetails?.city ? 'city' : 'category');
    const normalizedPreferenceValue = preferenceValue
      ?? destinationDetails?.city
      ?? destinationDetails?.category
      ?? null;

    const preferenceInsert = normalizedPreferenceValue
      ? supabase.from('user_preferences_evolution').insert({
          user_id: user.id,
          preference_type: normalizedPreferenceType as PreferenceType,
          preference_value: normalizedPreferenceValue,
          strength: action === 'more_like_this' ? 0.8 : 0.2,
          trend: action === 'more_like_this' ? 'increasing' : 'decreasing',
          context: metadataContext ?? 'smart_recommendations',
        })
      : null;

    const operations: Array<Promise<unknown>> = [interactionInsert];
    if (preferenceInsert) {
      operations.push(preferenceInsert);
    }

    await Promise.all(operations);

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error('Failed to record profile feedback:', error);
    return NextResponse.json(
      {
        error: 'Failed to record feedback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
