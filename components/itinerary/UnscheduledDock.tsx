import React from "react";
import { useDroppable } from "@dnd-kit/core";

import EventBlock from "./EventBlock";
import { Place } from "./ItineraryCanvas";

interface UnscheduledDockProps {
  items: Place[];
  rowHeight: number;
  slotMinutes: number;
}

const UnscheduledDock: React.FC<UnscheduledDockProps> = ({ items, rowHeight, slotMinutes }) => {
  const { isOver, setNodeRef } = useDroppable({ id: "unscheduled-dock", data: { type: "unscheduled" } });

  return (
    <aside
      ref={setNodeRef}
      className={`flex h-full flex-col gap-3 border border-gray-200 bg-white px-3 py-4 font-sans uppercase tracking-[0.08em] text-gray-900 shadow-[6px_6px_0px_0px_#0f172a] transition-colors dark:border-gray-800 dark:bg-black dark:text-white ${
        isOver ? "outline outline-2 outline-indigo-500" : ""
      }`}
    >
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span>Unscheduled</span>
        <span className="text-[10px] text-gray-500">{items.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="border border-dashed border-gray-300 px-3 py-4 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Drag items back here to unassign.
          </div>
        )}

        {items.map((item) => (
          <EventBlock
            key={item.id}
            item={{ ...item, startTime: item.startTime }}
            origin={{ type: "unscheduled" }}
            slotMinutes={slotMinutes}
            style={{ minHeight: rowHeight }}
          />
        ))}
      </div>
    </aside>
  );
};

export default UnscheduledDock;
