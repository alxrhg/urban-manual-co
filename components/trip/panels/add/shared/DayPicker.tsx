"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Calendar } from "lucide-react";
import type { Trip } from "@/types/trip";

interface DayPickerProps {
  trip: Trip;
  value: number;
  onChange: (day: number) => void;
  className?: string;
}

export function DayPicker({ trip, value, onChange, className }: DayPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTripDays = (): { day: number; date: Date | null; label: string }[] => {
    const days: { day: number; date: Date | null; label: string }[] = [];

    if (trip.start_date && trip.end_date) {
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      for (let i = 0; i < diffDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dayNum = i + 1;
        const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });
        const monthDay = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        days.push({
          day: dayNum,
          date,
          label: `Day ${dayNum} - ${dayOfWeek}, ${monthDay}`,
        });
      }
    } else {
      // If no dates set, allow days 1-7 as fallback
      for (let i = 1; i <= 7; i++) {
        days.push({
          day: i,
          date: null,
          label: `Day ${i}`,
        });
      }
    }

    return days;
  };

  const days = getTripDays();
  const selectedDay = days.find((d) => d.day === value);
  const displayLabel = selectedDay?.label || `Day ${value}`;

  const handleSelect = (day: number) => {
    onChange(day);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200",
          "bg-white text-sm text-gray-900 hover:border-gray-300 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-gray-300"
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>{displayLabel}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-56 bg-white rounded-lg border border-gray-200",
            "shadow-lg overflow-hidden"
          )}
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {days.map((dayOption) => (
              <button
                key={dayOption.day}
                type="button"
                onClick={() => handleSelect(dayOption.day)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                  value === dayOption.day && "bg-gray-50 font-medium"
                )}
              >
                {dayOption.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
