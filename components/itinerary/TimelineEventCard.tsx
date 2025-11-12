'use client';

import { useMemo } from 'react';
import type { PlannerBlock } from '@/contexts/PlannerContext';
import { PlannerBlockCardBase } from '@/components/planner/PlannerBlockCard';
import type { TimelineEventState } from './TimelineProvider';
import { useTimeline } from './TimelineProvider';

interface TimelineEventCardProps {
  dayId: string;
  dayDate: string;
  event: TimelineEventState;
  index: number;
}

function formatTimeLabel(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
}

function combineDateWithInput(dayDate: string, input?: string | null) {
  if (!input) return undefined;
  const match = input.match(/(\d{1,2}):(\d{2})/);
  const hours = match ? Number(match[1]) : 9;
  const minutes = match ? Number(match[2]) : 0;
  const clampedHours = Math.min(23, Math.max(0, hours));
  const clampedMinutes = Math.min(59, Math.max(0, minutes));
  const hh = clampedHours.toString().padStart(2, '0');
  const mm = clampedMinutes.toString().padStart(2, '0');
  return new Date(`${dayDate}T${hh}:${mm}:00Z`).toISOString();
}

export function TimelineEventCard({ dayId, dayDate, event, index }: TimelineEventCardProps) {
  const { updateEvent, removeEvent } = useTimeline();

  const block = useMemo<PlannerBlock>(() => {
    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    const endsAt = event.endsAt ? new Date(event.endsAt) : null;
    const duration = startsAt && endsAt ? Math.round((endsAt.getTime() - startsAt.getTime()) / (60 * 1000)) : event.durationMinutes ?? null;
    const category = event.metadata?.category;
    const type: PlannerBlock['type'] = category === 'lodging' ? 'lodging' : category === 'logistics' ? 'logistics' : 'activity';

    return {
      id: event.id,
      remoteId: undefined,
      type,
      title: event.title,
      description: event.description ?? '',
      time: formatTimeLabel(event.startsAt),
      durationMinutes: duration,
      location: event.metadata?.location as PlannerBlock['location'],
      attachments: [],
      notes: event.notes,
      metadata: event.metadata ?? null,
      comments: [],
      recommended: event.metadata?.source === 'engine',
    };
  }, [event]);

  return (
    <div className="space-y-2">
      <PlannerBlockCardBase
        dayId={dayId}
        block={block}
        dragPayload={{ type: 'timeline-event', eventId: event.id, dayId, index }}
        onUpdate={updates => {
          const next: Partial<TimelineEventState> = {};
          if (typeof updates.title === 'string') {
            next.title = updates.title;
          }
          if (typeof updates.description === 'string') {
            next.description = updates.description;
          }
          if (typeof updates.time === 'string') {
            const newStart = combineDateWithInput(dayDate, updates.time);
            if (newStart) {
              next.startsAt = newStart;
              if (event.durationMinutes && event.durationMinutes > 0) {
                const startDate = new Date(newStart);
                if (!Number.isNaN(startDate.getTime())) {
                  next.endsAt = new Date(startDate.getTime() + event.durationMinutes * 60 * 1000).toISOString();
                }
              }
            }
          }
          updateEvent(event.id, next);
        }}
        onRemove={() => removeEvent(event.id)}
        showCommentComposer={false}
      />
      {event.availability && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          <span className="font-semibold">Availability:</span>{' '}
          {event.availability.available ? 'Confirmed slot' : 'Not available'}
          {event.availability.seatsAvailable ? ` — ${event.availability.seatsAvailable} spots left` : ''}
        </div>
      )}
    </div>
  );
}
