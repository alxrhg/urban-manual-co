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
        "rounded-[16px] border border-neutral-200 dark:border-white/10",
        "bg-white dark:bg-[#1A1C1F]",
        "shadow-sm hover:shadow-md transition-shadow",
        "overflow-hidden",
        onClick && "cursor-pointer text-left w-full",
        className
      )}
    >
      {children}
    </Component>
  );
}
