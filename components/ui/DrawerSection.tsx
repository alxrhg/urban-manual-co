import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DrawerSectionProps {
  children: ReactNode;
  bordered?: boolean;
  className?: string;
}

export function DrawerSection({ children, bordered = false, className }: DrawerSectionProps) {
  return (
    <section className={cn("px-4 py-5 space-y-3", bordered && "border-b border-border", className)}>
      {children}
    </section>
  );
}
