"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BookingStatusType =
  | "not_booked"
  | "pending"
  | "confirmed"
  | "cancelled";

interface BookingStatusProps {
  status: BookingStatusType;
  onChange?: (status: BookingStatusType) => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  BookingStatusType,
  {
    label: string;
    shortLabel: string;
    icon: string;
    badgeClasses: string;
    selectItemClasses: string;
  }
> = {
  not_booked: {
    label: "Not booked",
    shortLabel: "Book",
    icon: "⚠️",
    badgeClasses:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    selectItemClasses: "text-amber-600 dark:text-amber-400",
  },
  pending: {
    label: "Pending",
    shortLabel: "Pending",
    icon: "🕐",
    badgeClasses:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    selectItemClasses: "text-gray-600 dark:text-gray-400",
  },
  confirmed: {
    label: "Confirmed",
    shortLabel: "Confirmed",
    icon: "✓",
    badgeClasses:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    selectItemClasses: "text-green-600 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    shortLabel: "Cancelled",
    icon: "✕",
    badgeClasses:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    selectItemClasses: "text-red-600 dark:text-red-400",
  },
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const SELECT_SIZE_CLASSES = {
  sm: "h-7 text-xs",
  md: "h-9 text-sm",
  lg: "h-10 text-base",
};

export function BookingStatus({
  status,
  onChange,
  size = "md",
  showLabel = true,
  className,
}: BookingStatusProps) {
  const config = STATUS_CONFIG[status];

  // Editable mode - render as dropdown select
  if (onChange) {
    return (
      <Select value={status} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "w-auto min-w-[120px] rounded-full",
            config.badgeClasses,
            SELECT_SIZE_CLASSES[size],
            className
          )}
        >
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{config.icon}</span>
              {showLabel && <span>{config.label}</span>}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {(Object.keys(STATUS_CONFIG) as BookingStatusType[]).map(
            (statusKey) => {
              const statusConfig = STATUS_CONFIG[statusKey];
              return (
                <SelectItem
                  key={statusKey}
                  value={statusKey}
                  className={statusConfig.selectItemClasses}
                >
                  <span className="flex items-center gap-2">
                    <span>{statusConfig.icon}</span>
                    <span>{statusConfig.label}</span>
                  </span>
                </SelectItem>
              );
            }
          )}
        </SelectContent>
      </Select>
    );
  }

  // Read-only mode - render as badge
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        config.badgeClasses,
        SIZE_CLASSES[size],
        className
      )}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
      {!showLabel && status === "not_booked" && (
        <span className="flex items-center gap-0.5">
          Book <span aria-hidden="true">→</span>
        </span>
      )}
    </span>
  );
}

export default BookingStatus;
