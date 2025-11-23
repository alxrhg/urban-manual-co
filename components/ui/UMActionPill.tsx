"use client";

import { cn } from "@/lib/utils";

interface UMActionPillProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary";
  className?: string;
}

export default function UMActionPill({
  children,
  onClick,
  variant = "default",
  className,
}: UMActionPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 h-[38px] rounded-xl border text-sm font-medium transition flex items-center",
        variant === "default" &&
          "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50",
        variant === "primary" &&
          "bg-black text-white border-black hover:bg-neutral-900",
        className
      )}
    >
      {children}
    </button>
  );
}

