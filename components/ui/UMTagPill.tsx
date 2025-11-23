"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface UMTagPillProps {
  children: ReactNode;
  className?: string;
}

/**
 * LEVEL 1 — TAG PILL (category tags)
 */
export default function UMTagPill({ children, className }: UMTagPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 h-[28px]",
        "rounded-lg border border-neutral-200 dark:border-white/20",
        "text-xs font-medium text-neutral-600 dark:text-neutral-300",
        "bg-white dark:bg-[#1A1C1F]",
        className
      )}
    >
      {children}
    </span>
  );
}

