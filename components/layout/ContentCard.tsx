"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContentCardVariant = "default" | "muted" | "gradient" | "transparent";

interface ContentCardProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  variant?: ContentCardVariant;
  className?: string;
}

const variantClasses: Record<ContentCardVariant, string> = {
  default:
    "bg-white/90 dark:bg-[#101215] border border-black/5 dark:border-white/[0.08] shadow-[0px_25px_80px_-45px_rgba(15,15,20,0.6)] dark:shadow-[0px_30px_120px_-60px_rgba(0,0,0,0.9)]",
  muted:
    "bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/[0.05]",
  gradient:
    "bg-gradient-to-br from-white via-neutral-50 to-neutral-100 dark:from-[#14171c] dark:via-[#0d0f13] dark:to-[#090b0f] border border-white/40 dark:border-white/5",
  transparent: "border border-white/10 bg-white/5 dark:bg-white/[0.02]",
};

export function ContentCard({
  title,
  eyebrow,
  description,
  children,
  actions,
  compact = false,
  variant = "default",
  className,
}: ContentCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] backdrop-blur-xl",
        variantClasses[variant],
        compact ? "px-5 py-5" : "px-6 py-7 md:px-8 md:py-8",
        className,
      )}
    >
      <div className="flex flex-col gap-5">
        {(eyebrow || title || description || actions) && (
          <header className="space-y-3">
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                {eyebrow}
              </p>
            )}
            {title && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-medium text-neutral-900 dark:text-white">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
                      {description}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex flex-wrap gap-2 text-sm text-neutral-500 dark:text-neutral-300">
                    {actions}
                  </div>
                )}
              </div>
            )}
            {!title && description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
