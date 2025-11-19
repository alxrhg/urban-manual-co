import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";

import EventBlock from "./EventBlock";
import { DragOrigin, Place } from "./ItineraryCanvas";

export interface DayColumnData {
  id: string;
  label: string;
  events: Place[];
}

interface DayColumnProps {
  day: DayColumnData;
  rowHeight: number;
  slotMinutes: number;
  totalSlots: number;
  gridRowStartFromTime: (time: string) => number;
  gridRowEndFromDuration: (startTime: string, duration: number) => number;
}

interface TimeSlotProps {
  dayId: string;
  slotIndex: number;
  rowHeight: number;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ dayId, slotIndex, rowHeight }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `${dayId}-slot-${slotIndex}`,
    data: { type: "time-slot", dayId, slotIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className="relative w-full border-b border-gray-200/60 transition-colors dark:border-gray-800/60"
      style={{ gridRowStart: slotIndex + 1, gridRowEnd: slotIndex + 2, minHeight: rowHeight }}
    >
      <span
        className={`pointer-events-none absolute inset-0 block bg-indigo-100/40 dark:bg-indigo-900/20 ${isOver ? "opacity-60" : "opacity-0"}`}
      />
    </div>
  );
};

interface TravelPlaceholderProps {
  startRow: number;
  endRow: number;
  tight: boolean;
}

const TravelPlaceholder: React.FC<TravelPlaceholderProps> = ({
  startRow,
  endRow,
  tight,
}) => (
  <div
    aria-hidden
    className="pointer-events-none flex items-center justify-center"
    style={{ gridRowStart: startRow, gridRowEnd: endRow }}
  >
    {tight ? (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-full w-px bg-gray-900 dark:bg-white" />
      </div>
    ) : (
      <div className="flex h-full w-full items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
          Travel Time
        </span>
      </div>
    )}
  </div>
);

const DayColumn: React.FC<DayColumnProps> = ({
  day,
  rowHeight,
  slotMinutes,
  totalSlots,
  gridRowStartFromTime,
  gridRowEndFromDuration,
}) => {
  const scheduledEvents = useMemo(
    () =>
      day.events
        .filter((event) => Boolean(event.startTime))
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
    [day.events],
  );

  const travelConnectors = useMemo(() => {
    const connectors: Array<{ startRow: number; endRow: number; tight: boolean }> = [];

    scheduledEvents.forEach((event, index) => {
      const next = scheduledEvents[index + 1];
      if (!event.startTime || !next?.startTime) return;

      const endRow = gridRowEndFromDuration(event.startTime, event.duration);
      const nextStart = gridRowStartFromTime(next.startTime);
      const gapMinutes = Math.max(
        0,
        (nextStart - endRow) * slotMinutes,
      );

      if (nextStart > endRow) {
        connectors.push({
          startRow: endRow,
          endRow: nextStart,
          tight: gapMinutes < slotMinutes,
        });
      }
    });

    return connectors;
  }, [gridRowEndFromDuration, gridRowStartFromTime, scheduledEvents, slotMinutes]);

  return (
    <div className="border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-900 dark:border-gray-800 dark:text-gray-100">
        <span>{day.label}</span>
        <span className="text-[10px] text-gray-500">{scheduledEvents.length} events</span>
      </div>

      <div
        className="relative grid"
        style={{ gridTemplateRows: `repeat(${totalSlots}, ${rowHeight}px)` }}
      >
        {Array.from({ length: totalSlots }, (_, index) => (
          <TimeSlot key={`${day.id}-${index}`} dayId={day.id} slotIndex={index} rowHeight={rowHeight} />
        ))}

        {scheduledEvents.map((event) => {
          if (!event.startTime) return null;
          const rowStart = gridRowStartFromTime(event.startTime);
          const rowEnd = gridRowEndFromDuration(event.startTime, event.duration);

          return (
            <EventBlock
              key={event.id}
              item={event}
              origin={{ type: "day", dayId: day.id } satisfies DragOrigin}
              slotMinutes={slotMinutes}
              style={{ gridRowStart: rowStart, gridRowEnd: rowEnd }}
            />
          );
        })}

        {travelConnectors.map((connector, idx) => (
          <TravelPlaceholder key={`${day.id}-travel-${idx}`} {...connector} />
        ))}
      </div>
    </div>
  );
};

export default DayColumn;
