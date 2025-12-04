"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Circle, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { BookingStatus } from "@/types/trip";

interface BookingStatusSelectProps {
  value: BookingStatus;
  onChange: (status: BookingStatus) => void;
  className?: string;
}

const STATUS_OPTIONS: {
  value: BookingStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "not_booked",
    label: "Not booked",
    icon: <Circle className="w-4 h-4" />,
    color: "text-gray-400",
  },
  {
    value: "pending",
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-500",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-500",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-500",
  },
];

export function BookingStatusSelect({
  value,
  onChange,
  className,
}: BookingStatusSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === value);

  const handleSelect = (status: BookingStatus) => {
    onChange(status);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200",
          "bg-white text-sm hover:border-gray-300 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-gray-300 w-full"
        )}
      >
        <span className={selectedOption?.color}>{selectedOption?.icon}</span>
        <span className="flex-1 text-left text-gray-900">
          {selectedOption?.label}
        </span>
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
            "absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200",
            "shadow-lg overflow-hidden"
          )}
        >
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors",
                "flex items-center gap-2",
                value === option.value && "bg-gray-50"
              )}
            >
              <span className={option.color}>{option.icon}</span>
              <span className="text-gray-900">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
