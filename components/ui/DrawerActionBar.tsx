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
        "border-t border-border bg-background px-4 py-3",
        "sticky bottom-0 left-0 right-0",
        "flex items-center justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}

