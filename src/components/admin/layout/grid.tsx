import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { GRID_CSS_VARIABLES, GRID_TOKENS } from "./tokens";

const gridlineStyle: CSSProperties = {
  backgroundImage: `linear-gradient(transparent calc(100% - 1px), var(--admin-gridline-color) 1px),
    linear-gradient(90deg, transparent calc(100% - 1px), var(--admin-gridline-color) 1px)`,
  backgroundSize: "var(--admin-gridline-size) var(--admin-gridline-size)",
};

export interface AdminGridProps extends HTMLAttributes<HTMLDivElement> {
  bleed?: boolean;
}

export function AdminGrid({ children, className, bleed = false, style, ...props }: AdminGridProps) {
  return (
    <div
      className={cn(
        "relative isolate w-full", bleed ? "px-0" : "px-4 sm:px-6 lg:px-10",
        "pb-16"
      )}
      style={{ ...GRID_CSS_VARIABLES, ...style }}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="h-full w-full" style={gridlineStyle} aria-hidden="true" />
      </div>
      <div className={cn("relative mx-auto max-w-6xl", className)}>{children}</div>
    </div>
  );
}

export interface GridSectionProps extends HTMLAttributes<HTMLElement> {
  as?: keyof HTMLElementTagNameMap;
}

export function GridSection({
  as: Component = "section",
  children,
  className,
  style,
  ...props
}: GridSectionProps) {
  return (
    <Component
      className={cn(
        "grid grid-cols-1 gap-y-6 md:grid-cols-12",
        className
      )}
      style={{ columnGap: "var(--admin-grid-gap-x)", rowGap: "var(--admin-grid-gap-y)", ...style }}
      {...props}
    >
      {children}
    </Component>
  );
}

export type GridCardSpan = {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
};

function spanToClass(span?: GridCardSpan) {
  if (!span) {
    return "md:col-span-12";
  }
  const map: Array<[keyof GridCardSpan, string]> = [
    ["base", ""],
    ["sm", "sm:"],
    ["md", "md:"],
    ["lg", "lg:"],
    ["xl", "xl:"],
  ];
  return map
    .map(([key, prefix]) => {
      const value = span[key];
      return value ? `${prefix}col-span-${value}` : null;
    })
    .filter(Boolean)
    .join(" ");
}

export interface GridCardProps extends HTMLAttributes<HTMLDivElement> {
  span?: GridCardSpan;
  tone?: "surface" | "muted" | "transparent";
}

export function GridCard({
  children,
  className,
  span,
  tone = "surface",
  ...props
}: GridCardProps) {
  const toneClass = {
    surface:
      "bg-white/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)]",
    muted:
      "bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/70 shadow-[0_10px_30px_rgba(15,23,42,0.05)]",
    transparent: "bg-transparent border border-transparent shadow-none",
  }[tone];

  return (
    <div
      className={cn(
        "col-span-1 md:col-span-12",
        spanToClass(span),
        toneClass,
        "rounded-[var(--admin-grid-card-radius)] backdrop-blur",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GridCardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-slate-200/60 px-5 py-4 sm:px-6 sm:py-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GridCardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-5 py-5 sm:px-6 sm:py-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function GridCardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-5 py-4 sm:px-6 sm:py-5 border-t border-slate-200/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GridDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-slate-200/70 dark:bg-slate-800", className)} />;
}

export const gridTypography = {
  label: GRID_TOKENS.font.label,
  title: GRID_TOKENS.font.title,
};
