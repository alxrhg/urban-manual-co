"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface UMCardProps {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
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
export default function UMCard({ className, children, onClick }: UMCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "rounded-[20px] border border-black/5 dark:border-white/10",
        "bg-white dark:bg-[#0f0f0f]",
        "transition-colors duration-200",
        onClick && "cursor-pointer text-left w-full hover:border-black/20 dark:hover:border-white/40",
        className
      )}
    >
      {children}
    </Component>
  );
}
