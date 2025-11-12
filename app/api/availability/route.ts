import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { loadDestinationData } from '@/services/itinerary/timeline';

const availabilityRequestSchema = z.object({
  attractionId: z.string().optional(),
  destinationSlug: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  partySize: z.number().optional(),
});

const payloadSchema = z.object({
  requests: z.array(availabilityRequestSchema),
});

function parseTime(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function isWithinOpeningWindow(
  date: Date,
  startTime: string,
  endTime: string | undefined,
  windows: string[] | undefined,
): boolean {
  if (!windows || windows.length === 0) {
    return true;
  }
  const targetStart = parseTime(startTime);
  const targetEnd = endTime ? parseTime(endTime) : targetStart;
  const startMinutes = targetStart.hours * 60 + targetStart.minutes;
  const endMinutes = targetEnd.hours * 60 + targetEnd.minutes;

  return windows.some(window => {
    const [windowStart, windowEnd] = window.split('-').map(parseTime);
    const windowStartMinutes = windowStart.hours * 60 + windowStart.minutes;
    const windowEndMinutes = windowEnd.hours * 60 + windowEnd.minutes;
    return startMinutes >= windowStartMinutes && endMinutes <= windowEndMinutes;
  });
}

const destinationCache = new Map<string, Awaited<ReturnType<typeof loadDestinationData>>>();

async function getDestination(slug: string) {
  if (!destinationCache.has(slug)) {
    destinationCache.set(slug, await loadDestinationData(slug));
  }
  return destinationCache.get(slug)!;
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid availability payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    parsed.data.requests.map(async req => {
      const destination = await getDestination(req.destinationSlug).catch(() => null);
      const attraction = destination?.attractions.find(item =>
        item.id === req.attractionId || item.slug === req.attractionId,
      );
      const targetDate = new Date(req.date);
      const weekday = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const windows = attraction?.openingHours?.[weekday] ?? [];
      const available = Boolean(attraction) && isWithinOpeningWindow(targetDate, req.startTime, req.endTime, windows);

      return {
        ...req,
        available,
        supplier: 'urban-manual-simulated',
        seatsAvailable: available ? Math.max(2, 10 - (req.partySize ?? 0)) : 0,
        currency: 'EUR',
        price: available ? 35 : undefined,
        notes: !attraction
          ? 'Attraction not found in destination dataset'
          : windows.length === 0
            ? 'Open access attraction'
            : undefined,
      };
    }),
  );

  return NextResponse.json({ availability: results });
}
