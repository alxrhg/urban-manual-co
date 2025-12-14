import { useMemo, useCallback } from 'react';
import {
  calculateDuration,
  estimateDuration,
  parseTimeToMinutes,
} from '@/lib/utils/time-calculations';
import { TIMELINE_CONFIG } from './config';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

export interface PositionedItem {
  item: EnrichedItineraryItem;
  start: number;
  duration: number;
  end: number;
  laneIndex: number;
  laneCount: number;
}

interface UseTimelinePositionsProps {
  items: EnrichedItineraryItem[];
  localEdits?: Record<string, { time?: string; duration?: number }>;
  livePositions?: Record<string, { start: number; duration: number }>;
}

interface UseTimelinePositionsResult {
  positionedItems: PositionedItem[];
  startHour: number;
  endHour: number;
  timelineHeight: number;
  minutesToPixels: (minutes: number) => number;
  snapToGrid: (minutes: number) => number;
}

export function useTimelinePositions({
  items,
  localEdits = {},
  livePositions = {},
}: UseTimelinePositionsProps): UseTimelinePositionsResult {
  const { pixelsPerMinute, gridMinutes } = TIMELINE_CONFIG;

  const parseItemStartMinutes = useCallback(
    (item: EnrichedItineraryItem, index: number): number => {
      const override = localEdits[item.id]?.time;
      const baseTime = override || item.time || item.parsedNotes?.departureTime;
      if (baseTime) return parseTimeToMinutes(baseTime);
      // Fallback spacing for items without time
      return 6 * 60 + index * 75;
    },
    [localEdits]
  );

  const parseItemDuration = useCallback(
    (item: EnrichedItineraryItem): number => {
      const overrideDuration = localEdits[item.id]?.duration;
      if (overrideDuration) return overrideDuration;

      if (item.parsedNotes?.duration) return item.parsedNotes.duration;
      if (item.parsedNotes?.departureTime && item.parsedNotes?.arrivalTime) {
        return calculateDuration(item.parsedNotes.departureTime, item.parsedNotes.arrivalTime);
      }

      const category = item.parsedNotes?.category || item.parsedNotes?.type || item.destination?.category;
      return estimateDuration(category);
    },
    [localEdits]
  );

  const positionedItems = useMemo(() => {
    const itemsWithTimes = items.map((item, index) => {
      const start = livePositions[item.id]?.start ?? parseItemStartMinutes(item, index);
      const duration = Math.max(livePositions[item.id]?.duration ?? parseItemDuration(item), 30);
      return {
        item,
        start,
        duration,
        end: start + duration,
      };
    });

    const sorted = [...itemsWithTimes].sort((a, b) => a.start - b.start);
    const lanes: number[] = [];

    return sorted.map((entry) => {
      let laneIndex = lanes.findIndex((end) => entry.start >= end);
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push(entry.end);
      } else {
        lanes[laneIndex] = entry.end;
      }

      return { ...entry, laneIndex, laneCount: lanes.length };
    });
  }, [items, livePositions, parseItemDuration, parseItemStartMinutes]);

  const { startHour, endHour } = useMemo(() => {
    const earliestMinute = Math.min(360, positionedItems.reduce((min, item) => Math.min(min, item.start), Infinity));
    const latestMinute = Math.max(1320, positionedItems.reduce((max, item) => Math.max(max, item.end + 45), 0));

    return {
      startHour: Math.max(6, Math.floor(earliestMinute / 60)),
      endHour: Math.min(24, Math.ceil(latestMinute / 60)),
    };
  }, [positionedItems]);

  const timelineHeight = (endHour * 60 - startHour * 60) * pixelsPerMinute;

  const minutesToPixels = useCallback(
    (minutes: number) => (minutes - startHour * 60) * pixelsPerMinute,
    [startHour, pixelsPerMinute]
  );

  const snapToGrid = useCallback(
    (minutes: number) => Math.round(minutes / gridMinutes) * gridMinutes,
    [gridMinutes]
  );

  return {
    positionedItems,
    startHour,
    endHour,
    timelineHeight,
    minutesToPixels,
    snapToGrid,
  };
}
