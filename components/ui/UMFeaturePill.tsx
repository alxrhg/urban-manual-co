"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface UMFeaturePillProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

/**
 * LEVEL 3 — FEATURE PILL (homepage "Create Trip")
 */
export default function UMFeaturePill({ children, onClick, className, type = "button" }: UMFeaturePillProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center px-6 h-[48px]",
        "rounded-full text-sm font-medium transition",
        "bg-black text-white hover:bg-neutral-900",
        "dark:bg-white dark:text-black dark:hover:bg-neutral-200",
        className
      )}
    >
      {children}
    </button>
  );
}
