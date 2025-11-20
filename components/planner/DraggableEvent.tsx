import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import clsx from "clsx";
import type { DockItem } from "./UnscheduledDock";

export type DraggableEventProps = {
  event: {
    id: string;
    title: string;
    category: string;
    duration: number;
  };
};

export function DraggableEventBlock({ event }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { type: "scheduled" },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "group relative flex cursor-grab select-none flex-col justify-between rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm ring-1 ring-inset ring-black/5 backdrop-blur-sm transition hover:shadow-md active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900/90",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-900 dark:text-white">{event.title}</p>
          <p className="mt-1 inline-flex rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-600 dark:border-zinc-700 dark:text-gray-400">
            {event.category}
          </p>
        </div>
        <GripVertical className="h-4 w-4 text-gray-400 opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="absolute inset-x-3 -bottom-2 h-1 cursor-s-resize rounded-full bg-gray-200 dark:bg-zinc-700" />
    </div>
  );
}

export function DraggableEventCard({ item, dragging, variant = "dock" }: { item: DockItem; dragging?: boolean; variant?: "dock" | "canvas" }) {
  return (
    <div
      className={clsx(
        "w-[360px] rounded-2xl border border-gray-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900",
        dragging && "opacity-90"
      )}
    >
      <div className="flex gap-3 p-3">
        <div className="h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-500">NO IMG</div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-white">{item.title}</p>
            <p className="mt-1 inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600 dark:border-zinc-700 dark:text-gray-400">
              {item.category}
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">{item.duration} MIN</p>
        </div>
      </div>
      {variant === "canvas" && (
        <div className="border-t border-dashed border-gray-200 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.22em] text-gray-500 dark:border-zinc-700">
          Drag to reschedule · Snap to 30m
        </div>
      )}
    </div>
  );
}
