import { useState, useEffect, useCallback } from 'react';
import { formatMinutesToTime, parseTimeToMinutes } from '@/lib/utils/time-calculations';
import { TIMELINE_CONFIG } from './config';
import type { PositionedItem } from './useTimelinePositions';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

type DragMode = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  itemId: string;
  mode: DragMode;
  startY: number;
  initialStart: number;
  initialDuration: number;
}

interface UseDragResizeProps {
  positionedItems: PositionedItem[];
  dayItems: EnrichedItineraryItem[];
  dayNumber: number;
  startHour: number;
  pixelsPerMinute: number;
  isEditMode: boolean;
  onTimeChange?: (itemId: string, time: string) => void;
  onDurationChange?: (itemId: string, duration: number) => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
}

interface UseDragResizeResult {
  livePositions: Record<string, { start: number; duration: number }>;
  localEdits: Record<string, { time?: string; duration?: number }>;
  dragState: DragState | null;
  handleDragStart: (
    itemId: string,
    mode: DragMode,
    start: number,
    duration: number,
    clientY: number
  ) => void;
  resetEdits: () => void;
}

export function useDragResize({
  positionedItems,
  dayItems,
  dayNumber,
  startHour,
  pixelsPerMinute,
  isEditMode,
  onTimeChange,
  onDurationChange,
  onReorderItems,
}: UseDragResizeProps): UseDragResizeResult {
  const { gridMinutes } = TIMELINE_CONFIG;

  const [livePositions, setLivePositions] = useState<
    Record<string, { start: number; duration: number }>
  >({});
  const [localEdits, setLocalEdits] = useState<
    Record<string, { time?: string; duration?: number }>
  >({});
  const [dragState, setDragState] = useState<DragState | null>(null);

  const snapToGrid = useCallback(
    (minutes: number) => Math.round(minutes / gridMinutes) * gridMinutes,
    [gridMinutes]
  );

  const updateLocalEdit = useCallback(
    (id: string, updates: { time?: string; duration?: number }) => {
      setLocalEdits((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...updates },
      }));
    },
    []
  );

  const resetEdits = useCallback(() => {
    setLivePositions({});
    setLocalEdits({});
  }, []);

  const handleDragStart = useCallback(
    (
      itemId: string,
      mode: DragMode,
      start: number,
      duration: number,
      clientY: number
    ) => {
      if (!isEditMode) return;
      setDragState({ itemId, mode, initialStart: start, initialDuration: duration, startY: clientY });
    },
    [isEditMode]
  );

  const finalizePosition = useCallback(
    (itemId: string, start: number, duration: number) => {
      const snappedStart = Math.max(startHour * 60, snapToGrid(start));
      const snappedDuration = Math.max(15, snapToGrid(duration));
      const newTime = formatMinutesToTime(snappedStart % (24 * 60));

      setLivePositions((prev) => ({
        ...prev,
        [itemId]: { start: snappedStart, duration: snappedDuration },
      }));
      updateLocalEdit(itemId, { time: newTime, duration: snappedDuration });
      onTimeChange?.(itemId, newTime);
      onDurationChange?.(itemId, snappedDuration);

      if (onReorderItems) {
        const updatedItems = dayItems.map((item) =>
          item.id === itemId
            ? { ...item, time: newTime, parsedNotes: { ...item.parsedNotes, duration: snappedDuration } }
            : item
        );
        const sorted = [...updatedItems].sort(
          (a, b) => parseTimeToMinutes(a.time || '00:00') - parseTimeToMinutes(b.time || '00:00')
        );
        const orderChanged = sorted.some((item, idx) => item.id !== updatedItems[idx]?.id);
        if (orderChanged) {
          onReorderItems(dayNumber, sorted as EnrichedItineraryItem[]);
        }
      }
    },
    [dayNumber, dayItems, onDurationChange, onReorderItems, onTimeChange, startHour, updateLocalEdit, snapToGrid]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: PointerEvent) => {
      const base = positionedItems.find((p) => p.item.id === dragState.itemId);
      if (!base) return;

      const deltaMinutes = (event.clientY - dragState.startY) / pixelsPerMinute;

      if (dragState.mode === 'move') {
        const nextStart = Math.max(startHour * 60, dragState.initialStart + deltaMinutes);
        setLivePositions((prev) => ({
          ...prev,
          [dragState.itemId]: {
            start: nextStart,
            duration: base.duration,
          },
        }));
      }

      if (dragState.mode === 'resize-end') {
        const nextDuration = Math.max(15, dragState.initialDuration + deltaMinutes);
        setLivePositions((prev) => ({
          ...prev,
          [dragState.itemId]: {
            start: base.start,
            duration: nextDuration,
          },
        }));
      }

      if (dragState.mode === 'resize-start') {
        const nextStart = dragState.initialStart + deltaMinutes;
        const nextDuration = Math.max(15, dragState.initialDuration - deltaMinutes);
        setLivePositions((prev) => ({
          ...prev,
          [dragState.itemId]: {
            start: Math.max(startHour * 60, nextStart),
            duration: nextDuration,
          },
        }));
      }
    };

    const handleUp = () => {
      const pending = livePositions[dragState.itemId];
      const base = positionedItems.find((p) => p.item.id === dragState.itemId);
      const finalStart = pending?.start ?? base?.start ?? startHour * 60;
      const finalDuration = pending?.duration ?? base?.duration ?? 60;
      finalizePosition(dragState.itemId, finalStart, finalDuration);
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, finalizePosition, livePositions, positionedItems, pixelsPerMinute, startHour]);

  return {
    livePositions,
    localEdits,
    dragState,
    handleDragStart,
    resetEdits,
  };
}
