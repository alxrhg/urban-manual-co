"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SubpageMetaStat = {
  label: string;
  value: string;
  hint?: string;
};

export type SubpagePill = {
  label: string;
  icon?: ReactNode;
};

interface SubpageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: SubpageMetaStat[];
  pills?: SubpagePill[];
  actions?: ReactNode;
  alignment?: "left" | "center";
  className?: string;
}

export function SubpageHero({
  eyebrow,
  title,
  description,
  meta = [],
  pills = [],
  actions,
  alignment = "left",
  className,
}: SubpageHeroProps) {
  const alignClasses =
    alignment === "center"
      ? "items-center text-center"
      : "items-start text-left";

  return (
    <section
      className={cn(
        "w-full rounded-[32px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#0F1114] shadow-[0px_25px_120px_-45px_rgba(15,15,20,0.35)] dark:shadow-[0px_35px_140px_-60px_rgba(0,0,0,0.9)] px-6 py-8 md:px-8 md:py-10 backdrop-blur-xl",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-6", alignClasses)}>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.35em] text-neutral-400 dark:text-neutral-500">
            {eyebrow}
          </p>
        )}

        <div className="space-y-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-light text-neutral-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>

        {pills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pills.map((pill, index) => (
              <span
                key={`${pill.label}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200/80 dark:border-white/15 bg-white/80 dark:bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                {pill.icon}
                {pill.label}
              </span>
            ))}
          </div>
        )}

        {actions && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
            {actions}
          </div>
        )}

        {meta.length > 0 && (
          <dl className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {meta.map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] px-4 py-4 text-left"
              >
                <dt className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                  {stat.label}
                </dt>
                <dd className="text-lg font-light text-neutral-900 dark:text-white">
                  {stat.value}
                </dd>
                {stat.hint && (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {stat.hint}
                  </p>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
