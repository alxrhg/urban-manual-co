"use client";

import { ReactNode } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Sparkles, Wand2 } from "lucide-react";
import { DraggableEventCard, PlannerItemCardProps } from "./DraggableEvent";

interface UnscheduledDockProps {
  items: PlannerItemCardProps[];
  actionSlot?: ReactNode;
  onAutofill?: () => void;
}

export function UnscheduledDock({ items, actionSlot, onAutofill }: UnscheduledDockProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500">Dock</p>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
              Unscheduled blocks
            </h2>
          </div>
          <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-zinc-800 dark:text-gray-200">
            {items.length} items
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-gray-50">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-50">
              AI Insight
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We noticed a 90 minute gap near the Design District. Autofill nearby coffee breaks and design shops?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onAutofill}
                className="inline-flex items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:shadow-md dark:border-white dark:bg-white dark:text-gray-900"
              >
                <Wand2 className="h-4 w-4" /> Autofill itinerary
              </button>
              {actionSlot}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <DraggableEventCard
              key={item.id}
              {...item}
              data={{
                title: item.title,
                category: item.category,
                duration: item.duration,
              }}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

