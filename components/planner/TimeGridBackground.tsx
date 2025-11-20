"use client";

interface TimeGridBackgroundProps {
  timeSlots: string[];
  slotHeight: number;
}

export function TimeGridBackground({ timeSlots, slotHeight }: TimeGridBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {timeSlots.map((time, index) => (
        <div
          key={time}
          className="border-b border-dashed border-gray-200 dark:border-zinc-800"
          style={{ height: index === timeSlots.length - 1 ? slotHeight : slotHeight }}
        />
      ))}
    </div>
  );
}

