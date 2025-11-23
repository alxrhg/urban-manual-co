"use client";

import { cn } from "@/lib/utils";

interface UMCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function UMCard({ children, className }: UMCardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-neutral-200 bg-white shadow-sm",
        "overflow-hidden transition hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

