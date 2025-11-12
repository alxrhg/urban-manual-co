'use client';

import { AlertCircle, BarChart3, CheckCircle2, PiggyBank } from 'lucide-react';
import { useMemo } from 'react';
import { usePlanner } from '@/contexts/PlannerContext';
import {
  calculateDayCosts,
  calculateUnresolvedTasks,
  collectTravelSegments,
  formatCurrency,
  formatDuration,
} from './plannerTravel';

export function PlannerInsightsPanel() {
  const { itinerary } = usePlanner();

  const insights = useMemo(() => {
    if (!itinerary) {
      return {
        totalCost: 0,
        totalBudget: undefined as number | undefined,
        perDayTravel: [] as Array<{ dayId: string; label: string; minutes: number }>,
        unresolved: [] as ReturnType<typeof calculateUnresolvedTasks>,
      };
    }

    const segments = collectTravelSegments(itinerary);
    const perDayTravel = itinerary.days.map(day => {
      const daySegments = segments.filter(segment => segment.dayId === day.id);
      const minutes = daySegments.reduce((total, segment) => total + (segment.durationMinutes ?? 0), 0);
      return { dayId: day.id, label: day.label, minutes };
    });

    let totalCost = 0;
    let totalBudget: number | undefined;

    itinerary.days.forEach(day => {
      const { spent, budget } = calculateDayCosts(day);
      totalCost += spent;
      if (typeof budget === 'number') {
        totalBudget = (totalBudget ?? 0) + budget;
      }
    });

    const unresolved = calculateUnresolvedTasks(itinerary.days);

    return { totalCost, totalBudget, perDayTravel, unresolved };
  }, [itinerary]);

  if (!itinerary) {
    return null;
  }

  const remainingBudget =
    typeof insights.totalBudget === 'number' ? insights.totalBudget - insights.totalCost : undefined;
  const overBudget = typeof remainingBudget === 'number' && remainingBudget < 0;

  return (
    <aside className="hidden w-[280px] flex-shrink-0 flex-col rounded-3xl border border-neutral-200/70 bg-white/85 p-5 shadow-lg shadow-neutral-900/5 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:shadow-black/40 lg:flex">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Planner insights</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Budget, travel time, and outstanding tasks</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 overflow-y-auto pr-1">
        <section className="space-y-3 rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-neutral-800/70 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <PiggyBank className="size-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Budget pulse</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {formatCurrency(insights.totalCost)} spent
              </p>
            </div>
          </div>
          {typeof insights.totalBudget === 'number' ? (
            <div className="space-y-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center justify-between">
                <span>Total budget</span>
                <span>{formatCurrency(insights.totalBudget)}</span>
              </div>
              <div className={`flex items-center justify-between ${overBudget ? 'text-red-500 dark:text-red-400' : ''}`}>
                <span>{overBudget ? 'Over budget' : 'Remaining'}</span>
                <span>
                  {formatCurrency(Math.abs(remainingBudget ?? 0))}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white/70 px-3 py-2 text-[11px] text-neutral-500 shadow-sm dark:bg-neutral-800/60 dark:text-neutral-400">
              Add budget details to logistics or stays to track remaining spend.
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-neutral-800/70 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Travel time</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {formatDuration(
                  insights.perDayTravel.reduce((total, entry) => total + entry.minutes, 0),
                )}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {insights.perDayTravel.map(entry => (
              <div key={entry.dayId} className="flex flex-col gap-1 rounded-xl bg-white/70 px-3 py-2 text-[11px] text-neutral-500 shadow-sm dark:bg-neutral-800/50 dark:text-neutral-300">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700 dark:text-neutral-100">{entry.label}</span>
                  <span>{formatDuration(entry.minutes)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800/70">
                  <div
                    className="h-full rounded-full bg-primary/50"
                    style={{ width: `${Math.min(100, (entry.minutes / 480) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {insights.perDayTravel.length === 0 && (
              <div className="rounded-xl bg-white/70 px-3 py-2 text-[11px] text-neutral-500 shadow-sm dark:bg-neutral-800/50 dark:text-neutral-400">
                Add logistics blocks to calculate travel time across your trip.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-neutral-800/70 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <AlertCircle className="size-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Unresolved tasks</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {insights.unresolved.length} {insights.unresolved.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          {insights.unresolved.length > 0 ? (
            <div className="space-y-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              {insights.unresolved.slice(0, 5).map(task => (
                <div
                  key={`${task.dayId}-${task.blockTitle}`}
                  className="flex flex-col gap-1 rounded-xl bg-white/70 px-3 py-2 shadow-sm dark:bg-neutral-800/50"
                >
                  <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-200">
                    <span className="font-medium">{task.blockTitle}</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                      {task.dayLabel}
                    </span>
                  </div>
                  {task.status ? (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                      Status: {task.status}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                      Needs confirmation
                    </span>
                  )}
                </div>
              ))}
              {insights.unresolved.length > 5 && (
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                  +{insights.unresolved.length - 5} more tasks pending
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] text-emerald-600 shadow-sm dark:bg-neutral-800/60 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              All set—no outstanding bookings.
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

export default PlannerInsightsPanel;
