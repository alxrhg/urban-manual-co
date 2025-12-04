"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

interface AmenityToggleProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function AmenityToggle({
  label,
  checked,
  onCheckedChange,
  children,
  className,
}: AmenityToggleProps) {
  return (
    <div
      className={cn(
        "border border-gray-200 rounded-lg overflow-hidden transition-all",
        checked && "border-gray-300 bg-gray-50/50",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between",
          "text-left hover:bg-gray-50 transition-colors"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              checked
                ? "bg-gray-900 border-gray-900"
                : "border-gray-300 bg-white"
            )}
          >
            {checked && <Check className="w-3 h-3 text-white" />}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              checked ? "text-gray-900" : "text-gray-600"
            )}
          >
            {label}
          </span>
        </div>
        {children && (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              checked && "rotate-180"
            )}
          />
        )}
      </button>

      {checked && children && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}
