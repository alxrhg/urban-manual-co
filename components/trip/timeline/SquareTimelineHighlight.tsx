import { Clock4, LayoutGrid, Layers3, Sparkles } from 'lucide-react';

interface SquareTimelineHighlightProps {
  dayNumber: number;
  dateLabel?: string | null;
  stopCount: number;
  timeWindow: string;
  spreadHours: string;
  overlapHint: string;
  laneCount: number;
}

/**
 * SquareTimelineHighlight - compact stat card inspired by square-ui components
 * Shows a quick snapshot of the day's timeline intensity and span.
 */
export function SquareTimelineHighlight({
  dayNumber,
  dateLabel,
  stopCount,
  timeWindow,
  spreadHours,
  overlapHint,
  laneCount,
}: SquareTimelineHighlightProps) {
  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-black/[0.05] bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 dark:border-white/[0.06] dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rotate-12 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-sky-400/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-0 h-24 w-24 rounded-3xl bg-gradient-to-tr from-sky-400/20 via-teal-300/10 to-transparent blur-2xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_10px_30px_-12px_rgba(56,189,248,0.65)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">Timeline boost</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Day {dayNumber}
              {dateLabel ? ` · ${dateLabel}` : ''}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-black/[0.05] backdrop-blur dark:bg-white/5 dark:text-gray-200 dark:ring-white/[0.08]">
          {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      <div className="relative mt-3 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white/80 px-3 py-2.5 text-left shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-200">
            <Clock4 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">Window</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{timeWindow}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">~{spreadHours} hrs in motion</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white/80 px-3 py-2.5 text-left shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
            <Layers3 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">Pace</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{overlapHint}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{laneCount} parallel lane{laneCount === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white/80 px-3 py-2.5 text-left shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-100">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">Flow</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Square UI touch</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Fresh sheen for the trip timeline</p>
          </div>
        </div>
      </div>
    </div>
  );
}
