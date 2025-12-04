"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock } from "lucide-react";

export interface TimeSlot {
  time: string;
  label: string;
  type: "suggested" | "gap" | "custom" | "standard";
}

interface TimeSlotPickerProps {
  value: string | null;
  onChange: (time: string | null) => void;
  suggestedSlots?: TimeSlot[];
  className?: string;
}

const STANDARD_TIMES: TimeSlot[] = [
  { time: "09:00", label: "Morning (9:00 AM)", type: "standard" },
  { time: "12:00", label: "Noon (12:00 PM)", type: "standard" },
  { time: "14:00", label: "Afternoon (2:00 PM)", type: "standard" },
  { time: "18:00", label: "Evening (6:00 PM)", type: "standard" },
  { time: "20:00", label: "Night (8:00 PM)", type: "standard" },
];

export function TimeSlotPicker({
  value,
  onChange,
  suggestedSlots = [],
  className,
}: TimeSlotPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [customTime, setCustomTime] = React.useState("");
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

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getDisplayLabel = (): string => {
    if (!value) return "Select time";
    const suggested = suggestedSlots.find((s) => s.time === value);
    if (suggested) return suggested.label;
    return formatTime(value);
  };

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  const handleCustomTimeSubmit = () => {
    if (customTime) {
      onChange(customTime);
      setIsOpen(false);
      setCustomTime("");
    }
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
        <Clock className="w-4 h-4 text-gray-400" />
        <span className={cn(!value && "text-gray-400")}>{getDisplayLabel()}</span>
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
            "absolute z-50 mt-1 w-64 bg-white rounded-lg border border-gray-200",
            "shadow-lg overflow-hidden"
          )}
        >
          <div className="max-h-72 overflow-y-auto">
            {suggestedSlots.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  Suggested
                </div>
                {suggestedSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => handleSelect(slot.time)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                      "flex items-center gap-2",
                      value === slot.time && "bg-gray-50 font-medium"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        slot.type === "gap" && "bg-blue-500",
                        slot.type === "suggested" && "bg-green-500"
                      )}
                    />
                    {slot.label}
                  </button>
                ))}
                <div className="border-t border-gray-100" />
              </>
            )}

            {STANDARD_TIMES.map((slot) => (
              <button
                key={slot.time}
                type="button"
                onClick={() => handleSelect(slot.time)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                  value === slot.time && "bg-gray-50 font-medium"
                )}
              >
                {slot.label}
              </button>
            ))}

            <div className="border-t border-gray-100" />
            <div className="p-3">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Custom time
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-sm rounded border border-gray-200",
                    "focus:outline-none focus:ring-2 focus:ring-gray-300"
                  )}
                />
                <button
                  type="button"
                  onClick={handleCustomTimeSubmit}
                  disabled={!customTime}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded",
                    "bg-gray-900 text-white hover:bg-gray-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
