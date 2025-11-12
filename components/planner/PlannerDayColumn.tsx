'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, NotebookPen, Paperclip, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePlanner } from '@/contexts/PlannerContext';
import type { PlannerDay, PlannerRecommendation } from '@/contexts/PlannerContext';
import { PlannerBlockCard } from './PlannerBlockCard';
import { PlannerSegmentCard } from './PlannerSegmentCard';
import { calculateDayCosts, formatCurrency, formatDuration, mapBlockToTravelSegment } from './plannerTravel';

interface PlannerDayColumnProps {
  day: PlannerDay;
  isActive: boolean;
}

export function PlannerDayColumn({ day, isActive }: PlannerDayColumnProps) {
  const {
    setActiveDay,
    updateDay,
    addBlock,
    removeDay,
    addAttachment,
    removeAttachment,
    addRecommendationToDay,
    itinerary,
  } = usePlanner();
  const [dragActive, setDragActive] = useState(false);
  const dayBlocks = day.blocks;

  const travelSegments = useMemo(() => {
    if (!itinerary) return [];
    const currentIndex = itinerary.days.findIndex(entry => entry.id === day.id);
    const nextDay = currentIndex >= 0 ? itinerary.days[currentIndex + 1] : undefined;
    return day.blocks
      .map(block => mapBlockToTravelSegment(day, block, nextDay))
      .filter((segment): segment is NonNullable<ReturnType<typeof mapBlockToTravelSegment>> => Boolean(segment));
  }, [day, itinerary]);

  const totalTransitMinutes = useMemo(
    () =>
      travelSegments.reduce((total, segment) => total + (segment?.durationMinutes ?? 0), 0),
    [travelSegments],
  );

  const aggregatedWarnings = useMemo(() => {
    const warnings = new Set<string>();
    travelSegments.forEach(segment => {
      segment.warnings.forEach(message => warnings.add(message));
    });
    if (totalTransitMinutes > 300) {
      warnings.add('Consider reducing travel time');
    }
    return Array.from(warnings);
  }, [totalTransitMinutes, travelSegments]);

  const dayCostSummary = useMemo(() => calculateDayCosts(day), [day]);
  const remainingLabel =
    typeof dayCostSummary.remaining === 'number'
      ? `${dayCostSummary.remaining >= 0 ? '' : '-'}${formatCurrency(Math.abs(dayCostSummary.remaining))}`
      : null;

  const handleAddCustomBlock = () => {
    const title = window.prompt('What would you like to add to this day?');
    if (!title) return;
    addBlock(day.id, {
      type: 'activity',
      title,
      description: '',
    });
  };

  const handleAddAttachment = () => {
    const url = window.prompt('Add a link, document, or reference URL');
    if (!url) return;
    const label = window.prompt('Attachment label', 'Resource');
    addAttachment(day.id, null, {
      label: label || 'Attachment',
      url,
      type: 'link',
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    try {
      const json = event.dataTransfer.getData('application/json');
      if (!json) return;
      const payload = JSON.parse(json);
      if (payload.type === 'recommendation') {
        const recommendation: PlannerRecommendation = payload.recommendation;
        addRecommendationToDay(day.id, recommendation);
        return;
      }
      if (payload.type === 'block') {
        const sourceDayId = payload.dayId as string | undefined;
        const blockId = payload.blockId as string | undefined;
        if (!sourceDayId || !blockId || !itinerary) return;
        const sourceDay = itinerary.days.find(d => d.id === sourceDayId);
        const block = sourceDay?.blocks.find(b => b.id === blockId);
        if (!block) return;
        if (sourceDayId !== day.id) {
          addBlock(day.id, {
            type: block.type,
            title: block.title,
            description: block.description || undefined,
            time: block.time || undefined,
            durationMinutes: block.durationMinutes || undefined,
            location: block.location,
            attachments: block.attachments,
            notes: block.notes,
            metadata: block.metadata || undefined,
            comments: block.comments,
            recommended: block.recommended,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to handle planner drop', error);
    }
  };

  return (
    <div
      className={`flex min-w-[280px] max-w-[320px] flex-col rounded-3xl border bg-white/90 shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900/80 ${
        isActive ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-neutral-200/70'
      } ${dragActive ? 'ring-2 ring-primary/40' : ''}`}
      onClick={() => setActiveDay(day.id)}
      onDragOver={event => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200/70 px-5 py-4 dark:border-neutral-800/60">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">Day {day.index}</div>
          <input
            value={day.label}
            onChange={event => updateDay(day.id, { label: event.target.value })}
            className="mt-1 w-full bg-transparent text-sm font-semibold text-neutral-800 outline-none dark:text-neutral-100"
          />
          <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <CalendarDays className="size-3" />
            <input
              type="date"
              value={day.date || ''}
              onChange={event => updateDay(day.id, { date: event.target.value || null })}
              className="bg-transparent text-[11px] font-medium outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
          <Button variant="ghost" size="icon-sm" onClick={handleAddCustomBlock} title="Add entry">
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleAddAttachment} title="Add attachment">
            <Paperclip className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeDay(day.id)}
            title="Remove day"
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {(travelSegments.length > 0 || dayCostSummary.budget != null) && (
          <div className="space-y-3 rounded-2xl border border-neutral-200/60 bg-neutral-50/80 p-4 text-[11px] text-neutral-500 dark:border-neutral-800/60 dark:bg-neutral-900/50 dark:text-neutral-400">
            {travelSegments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                  <span>Transit overview</span>
                  <span className="text-[10px] font-medium">
                    {formatDuration(totalTransitMinutes)} total transit
                  </span>
                </div>
                <div className="space-y-2">
                  {travelSegments.map(segment => (
                    <PlannerSegmentCard key={segment.id} segment={segment} variant="compact" />
                  ))}
                </div>
                {aggregatedWarnings.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                    {aggregatedWarnings.map(message => (
                      <span
                        key={message}
                        className="rounded-full bg-amber-100/70 px-2 py-1 dark:bg-amber-900/30"
                      >
                        {message}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dayCostSummary.budget != null && (
              <div className="rounded-xl bg-white/80 px-3 py-2 text-[11px] text-neutral-600 shadow-sm dark:bg-neutral-800/60 dark:text-neutral-300">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Budget</span>
                  <span className={`${dayCostSummary.remaining !== undefined && dayCostSummary.remaining < 0 ? 'text-red-500 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-200'}`}>
                    {formatCurrency(dayCostSummary.spent)} / {formatCurrency(dayCostSummary.budget)}
                  </span>
                </div>
                {remainingLabel && (
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                    Remaining {remainingLabel}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {day.attachments.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
              Attachments
            </div>
            <div className="space-y-1">
              {day.attachments.map(attachment => (
                <button
                  key={attachment.id}
                  onClick={() => removeAttachment(day.id, attachment.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200/60 bg-neutral-50/70 px-3 py-2 text-left text-[11px] text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70"
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="size-3.5" />
                    {attachment.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em]">Remove</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
            <NotebookPen className="size-3.5" /> Notes
          </div>
          <Textarea
            value={day.notes || ''}
            onChange={event => updateDay(day.id, { notes: event.target.value })}
            placeholder="Capture context or instructions for collaborators"
            className="min-h-[90px] rounded-2xl border-neutral-200/70 bg-neutral-50/70 text-xs text-neutral-700 focus-visible:ring-primary/30 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-200"
          />
        </div>

        <div className="space-y-3">
          {dayBlocks.length === 0 ? (
            <button
              onClick={handleAddCustomBlock}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200/70 px-6 py-10 text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-500 dark:border-neutral-800/80 dark:text-neutral-500"
            >
              <Plus className="size-5" />
              <span className="text-xs">Drop recommendations or click to add your first activity</span>
            </button>
          ) : (
            dayBlocks.map(block => (
              <PlannerBlockCard key={block.id} dayId={day.id} block={block} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PlannerDayColumn;
