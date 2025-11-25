import React from "react";
import { cn } from "@/lib/utils";

interface DrawerSectionProps {
  children: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export function DrawerSection({ children, bordered = false, className }: DrawerSectionProps) {
  return (
    <section
      className={cn(
        "px-5 py-5 space-y-3",
        bordered && "border-b border-black/5 dark:border-white/10",
        className
      )}
    >
      {children}
    </section>
  );
}

