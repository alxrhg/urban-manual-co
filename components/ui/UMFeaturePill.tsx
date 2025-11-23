"use client";

import { cn } from "@/lib/utils";

interface UMFeaturePillProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function UMFeaturePill({ children, onClick, className }: UMFeaturePillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 h-[48px] rounded-full bg-black text-white text-sm font-medium",
        "flex items-center justify-center hover:bg-neutral-900 transition",
        className
      )}
    >
      {children}
    </button>
  );
}

