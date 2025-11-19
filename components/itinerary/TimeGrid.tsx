import React from "react";

interface TimeGridProps {
  slots: string[];
  slotMinutes: number;
  totalSlots: number;
  rowHeight: number;
}

const TimeGrid: React.FC<TimeGridProps> = ({ slots, slotMinutes, totalSlots, rowHeight }) => {
  return (
    <div className="relative grid grid-rows-[auto_1fr] border-r border-gray-200 bg-gray-50/70 font-mono text-[11px] uppercase tracking-[0.06em] text-gray-700 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-200">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-gray-500 dark:border-gray-800 dark:bg-black dark:text-gray-400">
        Time
      </div>
      <div className="grid" style={{ gridTemplateRows: `repeat(${totalSlots}, ${rowHeight}px)` }}>
        {slots.map((time, index) => {
          const isHour = index % (60 / slotMinutes) === 0;
          return (
            <div
              key={time}
              className={`flex items-start border-b border-gray-200/60 px-3 pt-[10px] dark:border-gray-800/60 ${
                isHour ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500"
              }`}
            >
              <span>{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeGrid;
