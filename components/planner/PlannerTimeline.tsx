'use client';

import { Clock3, Compass } from 'lucide-react';
import { useMemo } from 'react';
import { usePlanner } from '@/contexts/PlannerContext';
import { PlannerSegmentCard } from './PlannerSegmentCard';
import { formatDuration, useItineraryTravelSegments } from './plannerTravel';

function formatDateLabel(date?: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function PlannerTimeline() {
  const { itinerary } = usePlanner();
  const segments = useItineraryTravelSegments(itinerary);

  const segmentsByPair = useMemo(() => {
    const map = new Map<string, typeof segments>();
    segments.forEach(segment => {
      const key = `${segment.dayId}->${segment.nextDayId ?? segment.dayId}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(segment);
    });
    return map;
  }, [segments]);

  const totalTransitMinutes = useMemo(
    () => segments.reduce((sum, segment) => sum + (segment.durationMinutes ?? 0), 0),
    [segments],
  );

  if (!itinerary || itinerary.days.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white/90 p-4 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
            <Compass className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Travel timeline</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Track how you move between cities across the itinerary.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-300">
          <Clock3 className="size-3.5" />
          {formatDuration(totalTransitMinutes)} total transit
        </div>
      </div>

      <div className="mt-4 flex items-stretch">
        {itinerary.days.map((day, index) => {
          const nextDay = itinerary.days[index + 1];
          const key = `${day.id}->${nextDay?.id ?? day.id}`;
          const pairSegments = segmentsByPair.get(key) ?? [];
          const dateLabel = formatDateLabel(day.date);

          return (
            <div key={day.id} className="flex items-stretch">
              <div className="flex min-w-[280px] max-w-[320px] flex-col items-center px-3">
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-neutral-200/70 bg-white/60 px-4 py-6 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/50">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400 dark:text-neutral-500">
                    Day {day.index}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{day.label}</div>
                  {dateLabel && (
                    <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{dateLabel}</div>
                  )}
                  <div className="mt-3 h-[3px] w-full rounded-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40" />
                </div>
              </div>

              {nextDay && (
                <div className="flex min-w-[220px] flex-col justify-center px-2">
                  <div className="relative flex flex-col gap-2 rounded-2xl border border-dashed border-neutral-200/70 bg-neutral-50/70 p-3 dark:border-neutral-800/70 dark:bg-neutral-900/40">
                    <div className="absolute left-[-12px] top-1/2 hidden h-[2px] w-4 -translate-y-1/2 rounded-full bg-neutral-200/80 md:block dark:bg-neutral-700/80" />
                    <div className="absolute right-[-12px] top-1/2 hidden h-[2px] w-4 -translate-y-1/2 rounded-full bg-neutral-200/80 md:block dark:bg-neutral-700/80" />
                    {pairSegments.length > 0 ? (
                      pairSegments.map(segment => <PlannerSegmentCard key={segment.id} segment={segment} variant="compact" />)
                    ) : (
                      <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-neutral-200/70 bg-white/80 text-[11px] text-neutral-400 dark:border-neutral-800/70 dark:bg-neutral-900/60 dark:text-neutral-500">
                        No travel planned
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlannerTimeline;
