import { useDroppable } from "@dnd-kit/core";
import { Clock3, MoveVertical } from "lucide-react";
import clsx from "clsx";
import { DraggableEventBlock } from "./DraggableEvent";
import { TimeGridBackground } from "./TimeGridBackground";

export type ScheduledEvent = {
  id: string;
  title: string;
  category: string;
  duration: number;
  start: number; // minutes from midnight
  day: number;
};

export function minutesLabel(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hrs >= 12 ? "PM" : "AM";
  const displayHour = ((hrs + 11) % 12) + 1;
  return `${displayHour}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

function DayColumn({
  day,
  slots,
  events,
  startHour,
}: {
  day: number;
  slots: number[];
  events: ScheduledEvent[];
  startHour: number;
}) {
  const rowHeight = 48; // px per 30m slot
  const sortedEvents = [...events].sort((a, b) => a.start - b.start);

  return (
    <div className="relative flex-1 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-3 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gray-700 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-gray-300">
        <span>Day {day}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 dark:border-zinc-700">Canvas</span>
      </div>

      <div className="relative h-full">
        <TimeGridBackground rows={slots.length} />
        <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${slots.length}, ${rowHeight}px)` }}>
          {slots.map((slot) => (
            <SlotDrop key={`${day}-${slot}`} day={day} slotMinute={slot} />
          ))}
        </div>

        {sortedEvents.map((event, idx) => {
          const offsetMinutes = event.start - startHour * 60;
          const top = (offsetMinutes / 30) * rowHeight;
          const height = (event.duration / 30) * rowHeight;
          const next = sortedEvents[idx + 1];
          const gap = next ? next.start - (event.start + event.duration) : 0;
          return (
            <div key={event.id} style={{ top }} className="absolute left-2 right-2">
              <div style={{ height }}>
                <DraggableEventBlock event={event} />
              </div>
              {gap > 0 && (
                <div
                  style={{ height: (gap / 30) * rowHeight }}
                  className="relative -mt-px flex items-center justify-center"
                >
                  <div className="h-full w-full rounded-xl border border-dashed border-gray-200 bg-gray-50/80 bg-[linear-gradient(45deg,rgba(0,0,0,0.05)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.05)_50%,rgba(0,0,0,0.05)_75%,transparent_75%,transparent)] bg-[length:10px_10px] text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-gray-400" />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500">
                    Travel + Buffer
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotDrop({ day, slotMinute }: { day: number; slotMinute: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${day}-${slotMinute}`,
    data: { day, slotMinute },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "relative",
        isOver && "bg-gray-900/5 ring-1 ring-inset ring-gray-900/30 dark:bg-white/5 dark:ring-white/20"
      )}
    >
      {isOver && (
        <div className="pointer-events-none absolute inset-1 rounded-xl border border-dashed border-gray-400/70 dark:border-white/30" />
      )}
    </div>
  );
}

export function ItineraryCanvas({
  days,
  timeSlots,
  events,
  startHour,
}: {
  days: number[];
  timeSlots: number[];
  events: ScheduledEvent[];
  startHour: number;
}) {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex w-20 shrink-0 flex-col border-r border-gray-200 bg-gray-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="sticky top-0 flex items-center gap-1 border-b border-gray-200 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-700 dark:border-zinc-800 dark:text-gray-300">
          <Clock3 className="h-4 w-4" /> Time
        </div>
        <div className="flex-1 divide-y divide-dashed divide-gray-200 dark:divide-zinc-800">
          {timeSlots.map((slot) => (
            <div
              key={`time-${slot}`}
              className="flex h-12 items-start px-3 pt-2 font-mono text-[10px] tracking-[0.35em] text-gray-500"
            >
              {minutesLabel(slot)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-gray-300">
          <div className="inline-flex items-center gap-2"><MoveVertical className="h-3.5 w-3.5" /> Drag to place events; snap to 30m grid</div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-gray-500">Travel gaps auto-calculated</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {days.map((day) => (
            <DayColumn
              key={day}
              day={day}
              slots={timeSlots}
              events={events.filter((evt) => evt.day === day)}
              startHour={startHour}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
