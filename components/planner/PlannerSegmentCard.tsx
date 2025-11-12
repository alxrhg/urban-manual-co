'use client';

import { AlertTriangle, ArrowRight, Bus, Car, Clock3, Footprints, Plane, Ship, Timer, TrainFront, Wallet } from 'lucide-react';
import type { PlannerTravelSegment } from './plannerTravel';
import { formatCurrency, formatDuration } from './plannerTravel';

interface PlannerSegmentCardProps {
  segment: PlannerTravelSegment;
  variant?: 'default' | 'compact';
}

const MODE_ICON_MAP: Record<string, typeof Plane> = {
  plane: Plane,
  flight: Plane,
  air: Plane,
  airline: Plane,
  train: TrainFront,
  rail: TrainFront,
  bus: Bus,
  coach: Bus,
  shuttle: Bus,
  car: Car,
  drive: Car,
  rideshare: Car,
  ferry: Ship,
  boat: Ship,
  cruise: Ship,
  walk: Footprints,
  walking: Footprints,
};

function resolveModeIcon(mode?: string) {
  if (!mode) return Plane;
  const normalized = mode.toLowerCase();
  const found = Object.entries(MODE_ICON_MAP).find(([key]) => normalized.includes(key));
  return found ? found[1] : Plane;
}

function formatTime(time?: string | null): string | null {
  if (!time) return null;
  const trimmed = time.trim();
  if (!trimmed) return null;
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return trimmed;
}

export function PlannerSegmentCard({ segment, variant = 'default' }: PlannerSegmentCardProps) {
  const Icon = resolveModeIcon(segment.mode);
  const departure = formatTime(segment.departureTime);
  const arrival = formatTime(segment.arrivalTime);
  const durationLabel = segment.durationMinutes ? formatDuration(segment.durationMinutes) : null;

  return (
    <div
      className={`relative rounded-2xl border border-neutral-200/70 bg-white/90 shadow-sm transition dark:border-neutral-800/70 dark:bg-neutral-900/70 ${
        variant === 'compact' ? 'px-3 py-3' : 'px-4 py-4'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 ${
            variant === 'compact' ? 'h-7 w-7' : 'h-8 w-8'
          }`}>
            <Icon className={`${variant === 'compact' ? 'size-3.5' : 'size-4'}`} />
          </span>
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
              {segment.mode ? segment.mode : 'Transit'}
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              <span>{segment.from ?? 'Departure'}</span>
              <ArrowRight className="size-4 text-neutral-300 dark:text-neutral-700" />
              <span>{segment.to ?? 'Arrival'}</span>
            </div>
            {segment.notes && variant === 'default' && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{segment.notes}</p>
            )}
            <div className="flex flex-wrap gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
              {departure && (
                <span className="flex items-center gap-1">
                  <Timer className="size-3.5" />
                  {departure}
                </span>
              )}
              {arrival && (
                <span className="flex items-center gap-1">
                  <Timer className="size-3.5" />
                  {arrival}
                </span>
              )}
              {durationLabel && (
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  {durationLabel}
                </span>
              )}
              {segment.bufferMinutes && segment.bufferMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  Buffer {formatDuration(segment.bufferMinutes)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right text-[11px] text-neutral-500 dark:text-neutral-400">
          {typeof segment.cost === 'number' && segment.cost > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
              <Wallet className="size-3" />
              {formatCurrency(segment.cost)}
            </span>
          )}
          {segment.budget != null && (
            <span className="rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              Budget {formatCurrency(segment.budget)}
            </span>
          )}
        </div>
      </div>

      {segment.warnings.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {segment.warnings.map(warning => (
            <span
              key={warning}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            >
              <AlertTriangle className="size-3" />
              {warning}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlannerSegmentCard;
