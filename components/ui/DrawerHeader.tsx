import React from "react";
import { cn } from "@/lib/utils";

interface DrawerHeaderProps {
  title: string;
  subtitle?: string;
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export function DrawerHeader({
  title,
  subtitle,
  leftAccessory,
  rightAccessory,
  bordered = true,
  className,
}: DrawerHeaderProps) {
  return (
    <header
      className={cn(
        "px-5 pt-5 pb-4",
        bordered && "border-b border-black/5 dark:border-white/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {leftAccessory && <div className="mt-0.5">{leftAccessory}</div>}
          <div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white leading-snug">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {rightAccessory && (
          <div className="flex items-center gap-2">{rightAccessory}</div>
        )}
      </div>
    </header>
  );
}

