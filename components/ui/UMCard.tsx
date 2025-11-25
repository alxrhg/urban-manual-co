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
        "bg-white/95 dark:bg-white/[0.04]",
        "shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
        "transition-shadow duration-300",
        onClick && "cursor-pointer text-left w-full hover:shadow-[0_25px_65px_rgba(15,23,42,0.12)]",
        className
      )}
    >
      {children}
    </Component>
  );
}
