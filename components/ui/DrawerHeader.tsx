import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DrawerHeaderProps {
  title: string;
  subtitle?: string;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  className?: string;
}

export function DrawerHeader({
  title,
  subtitle,
  leftAccessory,
  rightAccessory,
  className,
}: DrawerHeaderProps) {
  return (
    <div className={cn("px-4 pt-4 pb-3 border-b border-border", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {leftAccessory && <div className="shrink-0 mt-0.5">{leftAccessory}</div>}
          <div>
            <h2 className="text-xl font-medium">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {rightAccessory && <div className="flex items-center gap-2">{rightAccessory}</div>}
      </div>
    </div>
  );
}
