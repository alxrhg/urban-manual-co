'use client';

import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { TimelineEventCard } from './TimelineEventCard';
import { useTimeline } from './TimelineProvider';

function formatDayLabel(date: string, index: number) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return `Day ${index}`;
  }
  return `${parsed.toLocaleDateString(undefined, { weekday: 'short' })} · ${parsed.toLocaleDateString()}`;
}

function createDropHandler(dayId: string, position: number | undefined, moveEvent: ReturnType<typeof useTimeline>['moveEvent']) {
  return (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const json = event.dataTransfer.getData('application/json');
    if (!json) return;
    try {
      const payload = JSON.parse(json) as { type?: string; eventId?: string };
      if (payload.type === 'timeline-event' && payload.eventId) {
        moveEvent(payload.eventId, dayId, position);
      }
    } catch (error) {
      console.warn('Unable to parse drag payload', error);
    }
  };
}

export function TimelineGrid() {
  const { days, moveEvent } = useTimeline();
  const resolvedDays = useMemo(() => [...days].sort((a, b) => (a.index < b.index ? -1 : 1)), [days]);

  return (
    <div className="flex w-full gap-6 overflow-x-auto pb-6">
      {resolvedDays.map(day => (
        <div
          key={day.id}
          className="flex min-w-[320px] max-w-[360px] flex-1 flex-col rounded-3xl border border-neutral-200/80 bg-white/90 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50"
          onDragOver={event => event.preventDefault()}
          onDrop={createDropHandler(day.id, undefined, moveEvent)}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Day {day.index}</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <CalendarDays className="size-4" />
                {formatDayLabel(day.date, day.index)}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {day.events.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-200/80 bg-neutral-50/70 px-4 py-12 text-center text-xs text-neutral-500 dark:border-neutral-800/70 dark:bg-neutral-900/40 dark:text-neutral-400">
                Drag activities here to schedule this day
              </div>
            )}

            {day.events.map((event, index) => (
              <div
                key={event.id}
                onDragOver={event => event.preventDefault()}
                onDrop={createDropHandler(day.id, index, moveEvent)}
              >
                <TimelineEventCard dayId={day.id} dayDate={day.date} event={event} index={index} />
              </div>
            ))}

            {day.events.length > 0 && (
              <div
                className="rounded-2xl border border-dashed border-transparent px-4 py-6 text-center text-[11px] text-neutral-400 hover:border-neutral-200/60 hover:bg-neutral-50/60 dark:hover:border-neutral-700/60 dark:hover:bg-neutral-900/40"
                onDragOver={event => event.preventDefault()}
                onDrop={createDropHandler(day.id, day.events.length, moveEvent)}
              >
                Drop to append
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
