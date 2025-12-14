"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface UMTagPillProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * LEVEL 1 — TAG PILL (category tags)
 */
export default function UMTagPill({ children, className, onClick }: UMTagPillProps) {
  const Component = onClick ? "button" : "span";
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-4 min-h-[44px]",
        "rounded-lg border border-neutral-200 dark:border-white/20",
        "text-xs font-medium text-neutral-600 dark:text-neutral-300",
        "bg-white dark:bg-[#1A1C1F]",
        onClick && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors",
        className
      )}
    >
      {children}
    </Component>
  );
}

