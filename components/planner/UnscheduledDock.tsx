import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lightbulb, Sparkles } from "lucide-react";

export type DockItem = {
  id: string;
  title: string;
  category: string;
  duration: number;
  thumbnail?: string;
};

function SortableDockCard({ item }: { item: DockItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "dock" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${isDragging ? "opacity-70" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex gap-3 p-3">
        <div className="h-14 w-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-500">
              NO IMG
            </div>
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
    </div>
  );
}

export function UnscheduledDock({ items }: { items: DockItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "dock-drop" });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-900 dark:text-white">The Dock</p>
          <p className="font-mono text-[10px] tracking-[0.3em] text-gray-500">{items.length} UNSCHEDULED</p>
        </div>
        <div className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-600 dark:bg-zinc-800 dark:text-gray-400">
          AI SUGGESTS
        </div>
      </div>

      <div className="space-y-3 border-b border-gray-200 p-4 dark:border-zinc-800">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
          <div className="flex items-center gap-2 text-gray-800 dark:text-white">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">AI Insight</p>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            "Midtown is light at 3PM. Want me to autofill with nearby galleries and a coffee stop?"
          </p>
          <button className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black">
            <Lightbulb className="h-3.5 w-3.5" /> Autofill Gaps
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className={`flex-1 space-y-3 overflow-y-auto p-4 ${isOver ? "bg-gray-50/80 dark:bg-zinc-800/50" : ""}`}>
        <SortableContext items={items.map((itm) => itm.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableDockCard key={item.id} item={item} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
