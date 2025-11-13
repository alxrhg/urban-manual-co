import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GridCard, type GridCardProps, gridTypography } from "@/src/components/admin/layout";

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

type Trend = keyof typeof trendIcon;

export interface AdminStatCardProps extends Omit<GridCardProps, "children"> {
  label: string;
  value: ReactNode;
  hint?: string;
  deltaLabel?: string;
  trend?: Trend;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AdminStatCard({
  label,
  value,
  hint,
  deltaLabel,
  trend = "flat",
  icon,
  footer,
  className,
  span,
  ...props
}: AdminStatCardProps) {
  const TrendIcon = trendIcon[trend];
  const tone = trend === "down" ? "text-rose-500" : trend === "up" ? "text-emerald-500" : "text-slate-400";

  return (
    <GridCard
      span={span}
      className={cn("border border-slate-200/70 dark:border-slate-800/70", className)}
      {...props}
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn(gridTypography.label, "mb-1")}>{label}</p>
            <div className={cn(gridTypography.title, "text-4xl leading-tight")}>{value}</div>
            {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
          </div>
          {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
        </div>
        {(deltaLabel || footer) && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            {deltaLabel && (
              <div className="flex items-center gap-1 font-semibold uppercase tracking-[0.15em]">
                <TrendIcon className={cn("h-3.5 w-3.5", tone)} />
                <span className={tone}>{deltaLabel}</span>
              </div>
            )}
            {footer && <div className="text-right text-[0.75rem]">{footer}</div>}
          </div>
        )}
      </div>
    </GridCard>
  );
}
