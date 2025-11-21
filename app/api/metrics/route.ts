import { NextResponse } from 'next/server';

import { ContentMetricEvent, trackContentMetric } from '@/lib/metrics';

const allowedEvents: ContentMetricEvent[] = ['click', 'dwell', 'scroll', 'vector_failure', 'vector_fallback'];

type Sanitized = string | number | boolean | null | Sanitized[] | { [key: string]: Sanitized };

function sanitizeValue(value: unknown): Sanitized | undefined {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeValue(entry))
      .filter((entry): entry is Sanitized => entry !== undefined);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, Sanitized> = {};
    for (const [key, entry] of Object.entries(value)) {
      const sanitizedEntry = sanitizeValue(entry);
      if (sanitizedEntry !== undefined) {
        result[key] = sanitizedEntry;
      }
    }
    return result;
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, payload } = body ?? {};

    if (!allowedEvents.includes(event)) {
      return NextResponse.json({ error: 'Invalid metric event' }, { status: 400 });
    }

    const sanitizedPayload = sanitizeValue(payload) ?? {};
    await trackContentMetric(event, sanitizedPayload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Metrics API] Failed to log metric', error);
    return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
  }
}
