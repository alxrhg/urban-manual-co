'use client';

import { useMemo, useState, useCallback } from 'react';
import { GripVertical, Copy, Clock, Plus, Split, CheckSquare } from 'lucide-react';
import clsx from 'clsx';
import { formatTimeFromMinutes, parseTimeToMinutes } from '@/lib/intelligence/types';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';

interface TimeBlockBoardProps {
  day: TripDay;
  onScheduleChange: (itemId: string, startMinutes: number, durationMinutes?: number) => void;
  onSplitBlock?: (item: EnrichedItineraryItem, startMinutes: number, durationMinutes: number) => void;
  onDuplicateBlocks?: (itemIds: string[], targetDay: number) => void;
  onAddTemplate?: (template: TemplateBlock, dayNumber: number, startMinutes: number) => void;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

const BOARD_START = 6 * 60;
const BOARD_END = 24 * 60;
const MIN_DURATION = 30;
const SNAP_SMALL = 15;
const SNAP_LARGE = 30;
const PIXELS_PER_MINUTE = 1.4;

type DragKind = 'move' | 'resize';

export interface TemplateBlock {
  label: string;
  duration: number;
  category?: string;
}

function getStartMinutes(item: EnrichedItineraryItem) {
  if (item.parsedNotes?.startMinutes != null) return item.parsedNotes.startMinutes;
  if (item.time) return parseTimeToMinutes(item.time);
  return 9 * 60;
}

function getDuration(item: EnrichedItineraryItem) {
  if (item.parsedNotes?.duration != null) return item.parsedNotes.duration;
  return 60;
}

function snap(value: number, useLarge: boolean) {
  const step = useLarge ? SNAP_LARGE : SNAP_SMALL;
  return Math.round(value / step) * step;
}

function useBlockSelection(selectedIds: string[], onSelect: (ids: string[]) => void) {
  const toggle = useCallback(
    (id: string, multi: boolean) => {
      if (multi) {
        if (selectedIds.includes(id)) {
          onSelect(selectedIds.filter((s) => s !== id));
        } else {
          onSelect([...selectedIds, id]);
        }
      } else {
        onSelect([id]);
      }
    },
    [onSelect, selectedIds]
  );

  return { toggle };
}

export default function TimeBlockBoard({
  day,
  onScheduleChange,
  onSplitBlock,
  onDuplicateBlocks,
  onAddTemplate,
  selectedIds,
  onSelect,
}: TimeBlockBoardProps) {
  const [dragState, setDragState] = useState<{
    id: string;
    start: number;
    duration: number;
    kind: DragKind;
    originY: number;
  } | null>(null);

  const selection = useBlockSelection(selectedIds, onSelect);

  const sortedItems = useMemo(() => {
    return [...day.items].sort((a, b) => getStartMinutes(a) - getStartMinutes(b));
  }, [day.items]);

  const handleMouseDown = (
    e: React.MouseEvent,
    item: EnrichedItineraryItem,
    kind: DragKind
  ) => {
    const startMinutes = getStartMinutes(item);
    const duration = getDuration(item);
    setDragState({
      id: item.id,
      start: startMinutes,
      duration,
      kind,
      originY: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    const deltaY = e.clientY - dragState.originY;
    const deltaMinutes = snap(deltaY / PIXELS_PER_MINUTE, e.shiftKey);

    if (dragState.kind === 'move') {
      const nextStart = Math.min(
        Math.max(BOARD_START, dragState.start + deltaMinutes),
        BOARD_END - MIN_DURATION
      );
      onScheduleChange(dragState.id, nextStart, dragState.duration);
    } else {
      const nextDuration = Math.max(MIN_DURATION, snap(dragState.duration + deltaMinutes, e.shiftKey));
      onScheduleChange(dragState.id, dragState.start, nextDuration);
    }
  };

  const handleMouseUp = () => setDragState(null);

  const handleSplit = (item: EnrichedItineraryItem) => {
    const duration = getDuration(item);
    const start = getStartMinutes(item);
    onSplitBlock?.(item, start, duration);
  };

  const templates: TemplateBlock[] = [
    { label: 'Breakfast', duration: 60, category: 'cafe' },
    { label: 'Transit', duration: 30, category: 'transit' },
    { label: 'Check-in', duration: 45, category: 'hotel' },
  ];

  return (
    <div
      className="relative border border-stone-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="p-3 flex items-center justify-between border-b border-stone-100 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          Time grid with snapping (15m / hold shift for 30m)
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400">
            <CheckSquare className="w-3 h-3" /> {selectedIds.length} selected
            <Copy className="w-3 h-3" />
            {day.dayNumber > 1 && (
              <button
                className="underline"
                onClick={() => onDuplicateBlocks?.(selectedIds, day.dayNumber - 1)}
              >
                Copy to Day {day.dayNumber - 1}
              </button>
            )}
            <button
              className="underline"
              onClick={() => onDuplicateBlocks?.(selectedIds, day.dayNumber + 1)}
            >
              Copy to Day {day.dayNumber + 1}
            </button>
          </div>
        )}
      </div>

      <div className="flex">
        <div className="w-16 text-right pr-2 py-4 text-[11px] text-stone-400 space-y-10">
          {Array.from({ length: (BOARD_END - BOARD_START) / 60 + 1 }).map((_, idx) => {
            const minutes = BOARD_START + idx * 60;
            return <div key={minutes}>{formatTimeFromMinutes(minutes)}</div>;
          })}
        </div>
        <div className="relative flex-1 h-[calc( ( (24-6)*60 )*1.4px)] border-l border-stone-100 dark:border-gray-800">
          {Array.from({ length: (BOARD_END - BOARD_START) / 30 }).map((_, idx) => {
            const minutes = BOARD_START + idx * 30;
            return (
              <div
                key={minutes}
                className="absolute left-0 right-0 border-t border-dashed border-stone-100 dark:border-gray-800"
                style={{ top: (minutes - BOARD_START) * PIXELS_PER_MINUTE }}
              />
            );
          })}

          {sortedItems.map((item) => {
            const start = getStartMinutes(item);
            const duration = getDuration(item);
            const top = (start - BOARD_START) * PIXELS_PER_MINUTE;
            const height = duration * PIXELS_PER_MINUTE;
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={clsx(
                  'absolute left-0 right-4 rounded-lg shadow-sm border cursor-grab select-none',
                  'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-100',
                  isSelected && 'ring-2 ring-amber-400'
                )}
                style={{ top, height }}
                onMouseDown={(e) => {
                  selection.toggle(item.id, e.metaKey || e.ctrlKey || e.shiftKey);
                  handleMouseDown(e, item, 'move');
                }}
                onDoubleClick={() => handleSplit(item)}
              >
                <div className="flex items-center justify-between px-2 py-1 text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 opacity-60" />
                    {item.title}
                  </span>
                  <span>{formatTimeFromMinutes(start)} • {Math.round(duration)}m</span>
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize bg-amber-200/50 dark:bg-amber-500/30"
                  onMouseDown={(e) => handleMouseDown(e, item, 'resize')}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-stone-100 dark:border-gray-800 p-3 bg-stone-50/60 dark:bg-gray-900/50 flex flex-wrap gap-2 items-center">
        <Split className="w-4 h-4 text-stone-500" />
        {templates.map((template) => (
          <button
            key={template.label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-stone-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
            onClick={() => onAddTemplate?.(template, day.dayNumber, BOARD_START + 60)}
          >
            <Plus className="w-3 h-3" />
            {template.label} ({template.duration}m)
          </button>
        ))}
      </div>
    </div>
  );
}
