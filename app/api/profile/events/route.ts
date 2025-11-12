import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase-server';

const destinationEventSchema = z.object({
  type: z.enum(['view', 'save', 'visited']),
  destinationId: z.number().int().positive().optional(),
  destinationSlug: z.string().min(1).optional(),
  occurredAt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  context: z
    .object({
      source: z.string().optional(),
      searchQuery: z.string().optional(),
    })
    .optional(),
});

const requestSchema = z.object({
  events: z.array(destinationEventSchema).min(1),
});

type ParsedEvent = z.infer<typeof destinationEventSchema>;

type MetricsAccumulator = {
  user_id: string;
  event_date: string;
  views: number;
  saves: number;
  visited: number;
};

function normaliseDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid tracking payload',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const events = parsed.data.events.filter((event) => event.destinationId || event.destinationSlug);

  if (events.length === 0) {
    return NextResponse.json({ success: true, stored: 0, skipped: parsed.data.events.length });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slugToResolve = new Set<string>();

  for (const event of events) {
    if (!event.destinationId && event.destinationSlug) {
      slugToResolve.add(event.destinationSlug);
    }
  }

  const slugMap = new Map<string, number>();

  if (slugToResolve.size > 0) {
    const { data: destinationRows, error: destinationError } = await supabase
      .from('destinations')
      .select('id, slug')
      .in('slug', Array.from(slugToResolve));

    if (destinationError) {
      return NextResponse.json({ error: 'Failed to resolve destination slugs' }, { status: 500 });
    }

    for (const row of destinationRows ?? []) {
      if (row?.slug && row?.id) {
        slugMap.set(row.slug, row.id);
      }
    }
  }

  const nowISO = new Date().toISOString();
  const eventRows: Array<{
    user_id: string;
    destination_id: number;
    event_type: ParsedEvent['type'];
    occurred_at: string;
    metadata: Record<string, unknown> | null;
    context: Record<string, unknown> | null;
  }> = [];

  const metricsMap = new Map<string, MetricsAccumulator>();

  for (const event of events) {
    const destinationId = event.destinationId ?? (event.destinationSlug ? slugMap.get(event.destinationSlug) : undefined);

    if (!destinationId) {
      continue;
    }

    const occurredAt = normaliseDate(event.occurredAt);
    const metricsDate = occurredAt.slice(0, 10);
    const metadata = event.metadata ?? null;
    const context = event.context ? { ...event.context } : null;

    eventRows.push({
      user_id: user.id,
      destination_id: destinationId,
      event_type: event.type,
      occurred_at,
      metadata,
      context,
    });

    const metricsKey = `${user.id}:${metricsDate}`;
    const accumulator = metricsMap.get(metricsKey) ?? {
      user_id: user.id,
      event_date: metricsDate,
      views: 0,
      saves: 0,
      visited: 0,
    };

    switch (event.type) {
      case 'view':
        accumulator.views += 1;
        break;
      case 'save':
        accumulator.saves += 1;
        break;
      case 'visited':
        accumulator.visited += 1;
        break;
      default:
        break;
    }

    metricsMap.set(metricsKey, accumulator);
  }

  if (eventRows.length === 0) {
    return NextResponse.json({ success: true, stored: 0, skipped: events.length });
  }

  const { error: insertError } = await supabase.from('user_event_log').insert(eventRows);

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'Failed to persist events' }, { status: 500 });
  }

  for (const metrics of metricsMap.values()) {
    const { data: existingRow, error: existingError } = await supabase
      .from('user_daily_metrics')
      .select('id, views, saves, visited')
      .eq('user_id', metrics.user_id)
      .eq('event_date', metrics.event_date)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      return NextResponse.json({ error: existingError.message || 'Failed to read daily metrics' }, { status: 500 });
    }

    if (existingRow) {
      const { error: updateError } = await supabase
        .from('user_daily_metrics')
        .update({
          views: (existingRow.views ?? 0) + metrics.views,
          saves: (existingRow.saves ?? 0) + metrics.saves,
          visited: (existingRow.visited ?? 0) + metrics.visited,
          updated_at: nowISO,
        })
        .eq('id', existingRow.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message || 'Failed to update metrics' }, { status: 500 });
      }
    } else {
      const { error: createError } = await supabase.from('user_daily_metrics').insert({
        user_id: metrics.user_id,
        event_date: metrics.event_date,
        views: metrics.views,
        saves: metrics.saves,
        visited: metrics.visited,
        updated_at: nowISO,
      });

      if (createError) {
        return NextResponse.json({ error: createError.message || 'Failed to create metrics row' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true, stored: eventRows.length });
}
