"use client";

import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { GripVertical, MoveVertical, Timer } from "lucide-react";
import { TimeGridBackground } from "./TimeGridBackground";
import { useMemo } from "react";

export interface DayColumn {
  id: string;
  label: string;
}

export interface ScheduledEvent {
  id: string;
  title: string;
  category: string;
  dayId: string;
  start: string; // HH:mm
  duration: number; // minutes
  location?: string;
  accent?: string;
}

interface ItineraryCanvasProps {
  days: DayColumn[];
  timeSlots: string[];
  events: ScheduledEvent[];
  slotHeight?: number;
  onResize: (id: string, nextDuration: number) => void;
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getGapBlocks(events: ScheduledEvent[], startOfDay: string) {
  const startMinutes = parseTimeToMinutes(startOfDay);
  const sorted = [...events].sort(
    (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start)
  );
  const gaps: { startMinutes: number; duration: number }[] = [];

  sorted.forEach((event, index) => {
    const currentEnd = parseTimeToMinutes(event.start) + event.duration;
    const next = sorted[index + 1];
    if (next) {
      const gapDuration = parseTimeToMinutes(next.start) - currentEnd;
      if (gapDuration > 20) {
        gaps.push({ startMinutes: currentEnd, duration: gapDuration });
      }
    }
  });

  if (sorted.length === 0) {
    gaps.push({ startMinutes, duration: 90 });
  }

  return gaps;
}

function TimeSlotCell({
  slot,
  dayId,
  slotHeight,
}: {
  slot: string;
  dayId: string;
  slotHeight: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${dayId}-${slot}`,
    data: {
      type: "timeslot",
      day: dayId,
      time: slot,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ height: slotHeight }}
      className={`relative border-b border-gray-100 transition-colors dark:border-zinc-800 ${
        isOver ? "bg-gray-100/60 dark:bg-zinc-800/60" : ""
      }`}
    />
  );
}

function CanvasEventBlock({
  event,
  slotHeight,
  dayStart,
  onResize,
}: {
  event: ScheduledEvent;
  slotHeight: number;
  dayStart: string;
  onResize: (id: string, nextDuration: number) => void;
}) {
  const draggable = useDraggable({
    id: event.id,
    data: {
      source: "scheduled",
      eventId: event.id,
      title: event.title,
      category: event.category,
      duration: event.duration,
    },
  });

  const startMinutes = parseTimeToMinutes(event.start) - parseTimeToMinutes(dayStart);
  const topOffset = (startMinutes / 30) * slotHeight;
  const height = Math.max((event.duration / 30) * slotHeight, slotHeight * 0.75);

  const style = {
    transform: CSS.Translate.toString(draggable.transform),
  } as React.CSSProperties;

  const handleResize = (clientYStart: number) => {
    const startDuration = event.duration;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - clientYStart;
      const deltaSlots = Math.round(deltaY / slotHeight);
      const nextDuration = Math.max(30, Math.min(240, startDuration + deltaSlots * 30));
      onResize(event.id, nextDuration);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={draggable.setNodeRef}
      style={{ top: topOffset, height, ...style }}
      {...draggable.attributes}
      {...draggable.listeners}
      className={`absolute inset-x-2 cursor-grab rounded-xl border border-gray-200 bg-white/80 p-3 text-xs shadow-sm ring-1 ring-gray-100 backdrop-blur transition dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-zinc-800 ${
        draggable.isDragging ? "z-20 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
            {event.title}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-gray-500">
            <span className="rounded-full border border-gray-200 px-2 py-0.5 dark:border-zinc-700">{event.category}</span>
            <span className="flex items-center gap-1 text-gray-500">
              <Timer className="h-3 w-3" /> {event.duration}m
            </span>
            {event.location ? (
              <span className="text-gray-400">· {event.location}</span>
            ) : null}
          </div>
        </div>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          handleResize(e.clientY);
        }}
        className="absolute inset-x-3 bottom-1 flex cursor-ns-resize items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:border-zinc-700 dark:bg-zinc-800"
      >
        <MoveVertical className="mr-1 h-3 w-3" /> Resize
      </div>
    </div>
  );
}

export function ItineraryCanvas({
  days,
  timeSlots,
  events,
  slotHeight = 46,
  onResize,
}: ItineraryCanvasProps) {
  const startOfDay = useMemo(() => timeSlots[0], [timeSlots]);
  const canvasHeight = timeSlots.length * slotHeight;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500">Canvas</p>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
              Time-blocked itinerary canvas
            </h2>
          </div>
          <div className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-zinc-800 dark:text-gray-200">
            Snap: 30m
          </div>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto">
        <div className="flex min-w-full">
          <div className="sticky left-0 z-20 w-20 border-r border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-14 border-b border-gray-200 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600 dark:border-zinc-800 dark:text-gray-300">
              <div className="flex h-full items-center">Time</div>
            </div>
            <div>
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  style={{ height: slotHeight }}
                  className="flex items-start px-3 text-[10px] font-mono uppercase tracking-[0.14em] text-gray-500"
                >
                  {slot}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(320px, 1fr))` }}>
              {days.map((day) => {
                const dayEvents = events.filter((evt) => evt.dayId === day.id);
                const travelBlocks = getGapBlocks(dayEvents, startOfDay);

                return (
                  <div key={day.id} className="relative border-l border-gray-200 dark:border-zinc-800">
                    <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-50">
                      <span>{day.label}</span>
                      <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-mono tracking-[0.18em] text-gray-500 dark:border-zinc-800">
                        {dayEvents.length} blocks
                      </span>
                    </div>
                    <div className="relative" style={{ height: canvasHeight }}>
                      <TimeGridBackground timeSlots={timeSlots} slotHeight={slotHeight} />
                      {timeSlots.map((slot) => (
                        <TimeSlotCell key={`${day.id}-${slot}`} slot={slot} dayId={day.id} slotHeight={slotHeight} />
                      ))}
                      <div className="pointer-events-none absolute inset-0">
                        {travelBlocks.map((gap) => {
                          const top = ((gap.startMinutes - parseTimeToMinutes(startOfDay)) / 30) * slotHeight;
                          const height = (gap.duration / 30) * slotHeight;
                          return (
                            <div
                              key={`${day.id}-gap-${gap.startMinutes}`}
                              style={{ top, height }}
                              className="absolute left-2 right-2 rounded-lg border border-dashed border-gray-200 bg-[repeating-linear-gradient(135deg,#f4f4f5_0_8px,transparent_8px_16px)] opacity-60 dark:border-zinc-800 dark:bg-[repeating-linear-gradient(135deg,#27272a_0_8px,transparent_8px_16px)]"
                            />
                          );
                        })}
                      </div>
                      {dayEvents.map((event) => (
                        <CanvasEventBlock key={event.id} event={event} slotHeight={slotHeight} dayStart={startOfDay} onResize={onResize} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

