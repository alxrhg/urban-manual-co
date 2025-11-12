import { useMemo } from 'react';
import type { PlannerBlock, PlannerDay, PlannerItinerary } from '@/contexts/PlannerContext';

export interface PlannerTravelSegment {
  id: string;
  dayId: string;
  dayIndex: number;
  nextDayId?: string;
  label: string;
  from?: string;
  to?: string;
  mode?: string;
  departureTime?: string | null;
  arrivalTime?: string | null;
  durationMinutes?: number | null;
  cost?: number | null;
  budget?: number | null;
  bufferMinutes?: number | null;
  status?: string;
  notes?: string;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNestedValue(source: unknown, path: string): unknown {
  if (!isRecord(source)) return undefined;
  return path.split('.').reduce<unknown>((accumulator, key) => {
    if (!isRecord(accumulator)) return undefined;
    return accumulator[key];
  }, source);
}

function extractString(metadata: Record<string, unknown> | null | undefined, keys: string[]): string | undefined {
  if (!metadata) return undefined;
  for (const key of keys) {
    const value = getNestedValue(metadata, key);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (isRecord(value)) {
      if (typeof value.label === 'string' && value.label.trim()) {
        return value.label.trim();
      }
      if (typeof value.name === 'string' && value.name.trim()) {
        return value.name.trim();
      }
      if (typeof value.city === 'string' && value.city.trim()) {
        return value.city.trim();
      }
    }
  }
  return undefined;
}

function extractNumber(metadata: Record<string, unknown> | null | undefined, keys: string[]): number | undefined {
  if (!metadata) return undefined;
  for (const key of keys) {
    const value = getNestedValue(metadata, key);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function getBlockMetadata(block: PlannerBlock): Record<string, unknown> | null {
  return isRecord(block.metadata) ? (block.metadata as Record<string, unknown>) : null;
}

export function getBlockCost(block: PlannerBlock): number {
  const metadata = getBlockMetadata(block);
  const cost = extractNumber(metadata, [
    'cost',
    'price',
    'amount',
    'estimatedCost',
    'fare',
    'totalCost',
    'estimate',
    'value',
    'pricing.total',
    'pricing.amount',
  ]);
  return cost ?? 0;
}

export function getBlockBudget(block: PlannerBlock): number | undefined {
  const metadata = getBlockMetadata(block);
  return extractNumber(metadata, [
    'budget',
    'budgetAllocation',
    'budgetCap',
    'dailyBudget',
    'budgetLimit',
    'maxSpend',
    'allocation',
    'pricing.budget',
  ]);
}

export function getBlockStatus(block: PlannerBlock): string | undefined {
  const metadata = getBlockMetadata(block);
  const status = extractString(metadata, ['status', 'confirmationStatus', 'state', 'bookingStatus']);
  if (status) return status;
  if (block.notes && block.notes.trim()) return block.notes.trim();
  return undefined;
}

export function mapBlockToTravelSegment(
  day: PlannerDay,
  block: PlannerBlock,
  nextDay?: PlannerDay,
): PlannerTravelSegment | null {
  if (block.type !== 'logistics') {
    return null;
  }

  const metadata = getBlockMetadata(block);
  const from = extractString(metadata, [
    'from',
    'origin',
    'departure.city',
    'departure.location',
    'start.city',
    'startLocation.city',
    'route.from',
    'segment.from',
  ]);
  const to = extractString(metadata, [
    'to',
    'destination',
    'arrival.city',
    'arrival.location',
    'end.city',
    'endLocation.city',
    'route.to',
    'segment.to',
  ]);
  const mode = extractString(metadata, [
    'mode',
    'transport',
    'transportation',
    'transportMode',
    'vehicle',
    'carrier',
    'type',
  ]);
  const departureTime = extractString(metadata, [
    'departureTime',
    'departure.time',
    'startTime',
    'schedule.departure',
  ]);
  const arrivalTime = extractString(metadata, [
    'arrivalTime',
    'arrival.time',
    'endTime',
    'schedule.arrival',
  ]);
  const durationMinutes = extractNumber(metadata, [
    'travelDurationMinutes',
    'durationMinutes',
    'duration',
    'timeMinutes',
    'travelTime',
  ]) ?? block.durationMinutes ?? null;
  const cost = extractNumber(metadata, [
    'cost',
    'price',
    'amount',
    'estimatedCost',
    'fare',
    'totalCost',
  ]) ?? null;
  const bufferMinutes = extractNumber(metadata, [
    'bufferMinutes',
    'connectionBufferMinutes',
    'layoverMinutes',
    'transfer.bufferMinutes',
  ]) ?? null;
  const budget = getBlockBudget(block) ?? null;
  const status = extractString(metadata, ['status', 'confirmationStatus', 'state']);

  const warnings: string[] = [];
  if (typeof bufferMinutes === 'number' && bufferMinutes > 0 && bufferMinutes < 30) {
    warnings.push('Tight connection');
  }
  if (typeof durationMinutes === 'number' && durationMinutes > 360) {
    warnings.push('Long travel window');
  }

  return {
    id: block.id,
    dayId: day.id,
    dayIndex: day.index,
    nextDayId: nextDay?.id,
    label: block.title,
    from,
    to,
    mode,
    departureTime: departureTime ?? block.time ?? null,
    arrivalTime: arrivalTime ?? null,
    durationMinutes,
    cost,
    budget,
    bufferMinutes,
    status,
    notes: typeof block.description === 'string' ? block.description : undefined,
    warnings,
  };
}

export function collectTravelSegments(itinerary: PlannerItinerary | null | undefined): PlannerTravelSegment[] {
  if (!itinerary) return [];
  const segments: PlannerTravelSegment[] = [];

  itinerary.days.forEach((day, index) => {
    const nextDay = itinerary.days[index + 1];
    day.blocks.forEach(block => {
      const segment = mapBlockToTravelSegment(day, block, nextDay);
      if (segment) {
        segments.push(segment);
      }
    });
  });

  return segments;
}

export function useItineraryTravelSegments(itinerary: PlannerItinerary | null | undefined) {
  return useMemo(() => collectTravelSegments(itinerary), [itinerary]);
}

export function calculateDayCosts(day: PlannerDay) {
  const totals = day.blocks.reduce(
    (accumulator, block) => {
      const cost = getBlockCost(block);
      const budget = getBlockBudget(block);
      accumulator.spent += cost;
      if (typeof budget === 'number') {
        accumulator.budget = budget;
      }
      return accumulator;
    },
    { spent: 0, budget: undefined as number | undefined },
  );

  return {
    spent: totals.spent,
    budget: totals.budget,
    remaining: typeof totals.budget === 'number' ? totals.budget - totals.spent : undefined,
  };
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

export function calculateUnresolvedTasks(days: PlannerDay[]) {
  const unresolved: Array<{ dayId: string; dayLabel: string; blockTitle: string; status?: string }> = [];
  days.forEach(day => {
    day.blocks.forEach(block => {
      if (block.type === 'note') return;
      const status = getBlockStatus(block);
      if (!status) {
        unresolved.push({ dayId: day.id, dayLabel: day.label, blockTitle: block.title });
        return;
      }
      const normalized = status.toLowerCase();
      const resolvedStates = ['confirmed', 'booked', 'complete', 'completed', 'reserved'];
      if (!resolvedStates.some(state => normalized.includes(state))) {
        unresolved.push({ dayId: day.id, dayLabel: day.label, blockTitle: block.title, status });
      }
    });
  });
  return unresolved;
}
