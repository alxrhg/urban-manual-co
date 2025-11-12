import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';

type SerializableRecord = Record<string, unknown>;

interface AutoScheduleBlock {
  id: string;
  destinationId?: number | string | null;
  durationMinutes?: number | null;
  metadata?: SerializableRecord | null;
  travelMinutesFromPrevious?: number | null;
  estimatedCost?: number | string | null;
  notes?: string | null;
  timeOfDay?: string | null;
}

interface AutoScheduleRequestBody {
  tripId?: number | string | null;
  city?: string | null;
  dayId?: string | null;
  dayDate?: string | null;
  startTime?: string | null;
  constraints?: {
    startTime?: string | null;
    defaultTravelMinutes?: number | null;
  } | null;
  blocks?: AutoScheduleBlock[];
  travel?: Array<{ fromBlockId?: string | null; toBlockId?: string | null; minutes?: number | string | null }>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function extractFromMetadata(metadata: SerializableRecord | null | undefined, path: string[]): unknown {
  if (!metadata) return undefined;
  let current: unknown = metadata;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as SerializableRecord)[key];
  }
  return current;
}

function resolveDestinationId(block: AutoScheduleBlock): number | null {
  const direct = toNumber(block.destinationId ?? null);
  if (direct != null) return direct;
  const metadata = block.metadata as SerializableRecord | undefined;
  const candidates = [
    extractFromMetadata(metadata, ['destinationId']),
    extractFromMetadata(metadata, ['destination', 'id']),
    extractFromMetadata(metadata, ['place', 'id']),
    extractFromMetadata(metadata, ['poi', 'id']),
  ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate ?? null);
    if (parsed != null) return parsed;
  }
  return null;
}

function resolveDurationMinutes(block: AutoScheduleBlock): number | null {
  const direct = toNumber(block.durationMinutes ?? null);
  if (direct != null) return direct;
  const metadata = block.metadata as SerializableRecord | undefined;
  const candidates = [
    extractFromMetadata(metadata, ['durationMinutes']),
    extractFromMetadata(metadata, ['duration']),
    extractFromMetadata(metadata, ['timing', 'durationMinutes']),
    extractFromMetadata(metadata, ['timing', 'duration']),
  ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate ?? null);
    if (parsed != null) return parsed;
  }
  return null;
}

function resolveTravelMinutes(
  block: AutoScheduleBlock,
  previousBlock: AutoScheduleBlock | undefined,
  travelMap: Map<string, number>,
): number | null {
  const direct = toNumber(block.travelMinutesFromPrevious ?? null);
  if (direct != null) return direct;

  if (previousBlock) {
    const key = `${previousBlock.id}->${block.id}`;
    const mapped = travelMap.get(key);
    if (typeof mapped === 'number') {
      return mapped;
    }
  }

  const metadata = block.metadata as SerializableRecord | undefined;
  const candidates = [
    extractFromMetadata(metadata, ['timing', 'travelMinutesFromPrevious']),
    extractFromMetadata(metadata, ['travelMinutesFromPrevious']),
    extractFromMetadata(metadata, ['travelTimeMinutes']),
    extractFromMetadata(metadata, ['transit', 'durationMinutes']),
    extractFromMetadata(metadata, ['transit', 'minutes']),
  ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate ?? null);
    if (parsed != null) return parsed;
  }

  return null;
}

function resolveEstimatedCost(block: AutoScheduleBlock): number | null {
  const direct = toNumber(block.estimatedCost ?? null);
  if (direct != null) return direct;
  const metadata = block.metadata as SerializableRecord | undefined;
  const candidates = [
    extractFromMetadata(metadata, ['estimatedCost']),
    extractFromMetadata(metadata, ['cost']),
    extractFromMetadata(metadata, ['pricing', 'estimatedCost']),
    extractFromMetadata(metadata, ['pricing', 'estimate']),
    extractFromMetadata(metadata, ['pricing', 'cost']),
  ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate ?? null);
    if (parsed != null) return parsed;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    await supabase.auth.getUser();

    const body = (await request.json()) as AutoScheduleRequestBody;

    if (!Array.isArray(body.blocks) || body.blocks.length === 0) {
      return NextResponse.json(
        { error: 'At least one block is required to auto-schedule.' },
        { status: 400 },
      );
    }

    const travelMap = new Map<string, number>();
    if (Array.isArray(body.travel)) {
      for (const entry of body.travel) {
        if (!entry) continue;
        const minutes = toNumber(entry.minutes ?? null);
        if (entry.fromBlockId && entry.toBlockId && minutes != null) {
          travelMap.set(`${entry.fromBlockId}->${entry.toBlockId}`, minutes);
        }
      }
    }

    const itineraryItems = body.blocks.map((block, index) => {
      const destinationId = resolveDestinationId(block);
      const previousBlock = index > 0 ? body.blocks![index - 1] : undefined;
      const travelMinutes = resolveTravelMinutes(block, previousBlock, travelMap);
      const durationMinutes = resolveDurationMinutes(block);
      const estimatedCost = resolveEstimatedCost(block);

      return {
        destination_id: destinationId != null ? String(destinationId) : `block-${index}`,
        order: index + 1,
        duration_minutes: durationMinutes ?? undefined,
        time_of_day: typeof block.timeOfDay === 'string' ? block.timeOfDay : undefined,
        notes: typeof block.notes === 'string' ? block.notes : undefined,
        travel_time_minutes: travelMinutes ?? undefined,
        estimated_cost: estimatedCost ?? undefined,
      };
    });

    const recommendation = await multiDayTripPlanningService.recommendDaySchedule({
      items: itineraryItems,
      startTime: body.startTime || body.constraints?.startTime || undefined,
      defaultTravelMinutes: toNumber(body.constraints?.defaultTravelMinutes ?? null) ?? undefined,
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Unable to generate schedule recommendations.' },
        { status: 500 },
      );
    }

    const response = {
      tripId: body.tripId ?? null,
      dayId: body.dayId ?? null,
      date: body.dayDate ?? null,
      city: body.city ?? null,
      totals: {
        travelMinutes: recommendation.totalTravelTime,
        estimatedCost: recommendation.estimatedCost,
      },
      recommendations: recommendation.schedule.map((item, index) => ({
        blockId: body.blocks?.[index]?.id ?? null,
        destinationId: item.destinationId ?? null,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: item.durationMinutes,
        travelTimeMinutes: item.travelTimeMinutes ?? 0,
        timeOfDay: item.timeOfDay,
        notes: item.notes,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to auto-schedule day', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
