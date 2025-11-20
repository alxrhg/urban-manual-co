"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Clock, GripVertical } from "lucide-react";
import { motion } from "framer-motion";

export interface PlannerItemCardProps {
  id: string;
  title: string;
  category: string;
  duration: number;
  location?: string;
  accent?: string;
  compact?: boolean;
  data?: Record<string, unknown>;
}

export function DraggableEventCard({
  id,
  title,
  category,
  duration,
  location,
  accent = "from-gray-200 to-gray-300",
  compact,
  data = {},
}: PlannerItemCardProps) {
  const sortable = useSortable({
    id,
    data: {
      ...data,
      source: "unscheduled",
    },
  });

  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      className={`group relative rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${
        sortable.isDragging ? "z-10 scale-[1.02] border-gray-400 shadow-lg" : ""
      }`}
    >
      <div className="absolute right-2 top-2 text-gray-400">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-3">
        <div className={`h-12 w-12 flex-shrink-0 rounded-lg bg-gradient-to-br ${accent} ring-1 ring-gray-200 dark:ring-zinc-800`} />
        <div className="min-w-0 space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
            {title}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-gray-500">
            <span className="rounded-full border border-gray-200 px-2 py-0.5 dark:border-zinc-700">{category}</span>
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="h-3 w-3" /> {duration}m
            </span>
            {location ? <span className="text-gray-400">· {location}</span> : null}
          </div>
        </div>
      </div>
      {compact ? null : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Flexible slot — drag to a day column to schedule.
        </p>
      )}
    </div>
  );
}

export function PlannerDragPreview({
  title,
  category,
  duration,
}: {
  title: string;
  category: string;
  duration: number;
}) {
  return (
    <motion.div
      layout
      className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">{title}</div>
      <div className="mt-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-gray-500">
        <span className="rounded-full border border-gray-200 px-2 py-0.5 dark:border-zinc-700">{category}</span>
        <span className="flex items-center gap-1 text-gray-500">
          <Clock className="h-3 w-3" /> {duration}m
        </span>
      </div>
    </motion.div>
  );
}

