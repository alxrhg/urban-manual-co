import React from "react";
import { cn } from "@/lib/utils";

interface DrawerActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerActionBar({ children, className }: DrawerActionBarProps) {
  return (
    <div
      className={cn(
        "border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#050505]/85 px-5 py-4",
        "backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        "sticky bottom-0 left-0 right-0",
        "flex items-center justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}

