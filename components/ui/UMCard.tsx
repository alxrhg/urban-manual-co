"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface UMCardProps {
  className?: string;
  children: ReactNode;
}

/**
 * Universal card component used across:
 * - Trip drawers
 * - Place selector
 * - AI suggestions
 * - Day editor
 * 
 * Matches homepage cards (radius=16, subtle border, soft shadow)
 */
export default function UMCard({ className, children }: UMCardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-neutral-200 dark:border-white/10",
        "bg-white dark:bg-[#1A1C1F]",
        "shadow-sm hover:shadow-md transition-shadow",
        "overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
