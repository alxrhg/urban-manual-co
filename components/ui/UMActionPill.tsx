"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface UMActionPillProps {
  children: ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "default" | "primary";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

/**
 * LEVEL 2 — ACTION PILL (drawer buttons)
 */
export default function UMActionPill({
  children,
  onClick,
  variant = "default",
  className,
  type = "button",
  disabled = false,
}: UMActionPillProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center px-4 h-[38px]",
        "rounded-xl border text-sm font-medium transition",
        // Light mode
        variant === "default" &&
          "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50",
        // Dark mode
        variant === "default" &&
          "dark:border-white/15 dark:bg-[#1A1C1F] dark:text-white/90 dark:hover:bg-white/5",
        // Primary (black in light, white in dark)
        variant === "primary" &&
          "border-black bg-black text-white hover:bg-neutral-900",
        variant === "primary" &&
          "dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}
