'use client';

import React, { useMemo } from 'react';
import { TrendingUpIcon, TrendingDownIcon, WalletIcon } from 'lucide-react';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

interface TripBudgetTrackerProps {
  days: DayItinerary[];
  totalBudget: number;
  onUpdateBudget: (budget: number) => void;
  onPersistTotalBudget?: (budget: number) => void;
  onUpdateDayBudget: (dayIndex: number, budget: number) => void;
  onPersistDayBudget?: (
    dayIndex: number,
    budget: number,
    date: string
  ) => void;
}

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
};

export function TripBudgetTracker({
  days,
  totalBudget,
  onUpdateBudget,
  onPersistTotalBudget,
  onUpdateDayBudget,
  onPersistDayBudget,
}: TripBudgetTrackerProps) {
  const totalSpent = useMemo(
    () =>
      days.reduce((total, day) => {
        return (
          total +
          day.locations.reduce((dayTotal, loc) => dayTotal + (loc.cost || 0), 0)
        );
      }, 0),
    [days]
  );

  const plannedTotal = useMemo(
    () => days.reduce((sum, day) => sum + (day.budget || 0), 0),
    [days]
  );

  const remaining = totalBudget - totalSpent;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const plannedDelta = totalBudget - plannedTotal;

  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();

    days.forEach((day) => {
      day.locations.forEach((loc) => {
        if (!loc.cost) return;
        breakdown.set(loc.category, (breakdown.get(loc.category) || 0) + loc.cost);
      });
    });

    return Array.from(breakdown.entries()).sort((a, b) => b[1] - a[1]);
  }, [days]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Total Budget
            </p>
            <div className="flex items-center gap-3">
              <WalletIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
              <input
                type="number"
                value={Number.isFinite(totalBudget) ? totalBudget : 0}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (Number.isNaN(parsed)) return;
                  onUpdateBudget(parsed);
                }}
                onBlur={(e) => {
                  const parsed = Number(e.target.value);
                  if (Number.isNaN(parsed)) return;
                  onPersistTotalBudget?.(parsed);
                }}
                className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-2xl font-light text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-600 dark:focus:ring-neutral-700"
              />
            </div>
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Daily allocations total {formatCurrency(plannedTotal)}
            </p>
          </div>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Spent
            </p>
            <p className="text-3xl font-light text-neutral-900 dark:text-neutral-100 mb-2">
              {formatCurrency(totalSpent)}
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              {percentSpent > 100 ? (
                <>
                  <TrendingUpIcon className="w-3 h-3 text-red-500" />
                  <span className="text-red-500">
                    {percentSpent.toFixed(0)}% over budget
                  </span>
                </>
              ) : (
                <>
                  <TrendingDownIcon className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">
                    {percentSpent.toFixed(0)}% of budget
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Remaining
            </p>
            <p
              className={`text-3xl font-light mb-2 ${
                remaining < 0
                  ? 'text-red-500'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {formatCurrency(Math.abs(remaining))}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Planned allocation {plannedDelta >= 0 ? 'under' : 'over'} total by{' '}
              {formatCurrency(Math.abs(plannedDelta))}
            </p>
          </div>
        </div>

        {totalBudget > 0 && plannedDelta < 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            Daily budgets exceed your total by {formatCurrency(Math.abs(plannedDelta))}.
            Consider adjusting allocations.
          </div>
        )}

        {/* Progress Bar */}
        <div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                percentSpent > 100 ? 'bg-red-500' : 'bg-neutral-900 dark:bg-neutral-100'
              }`}
              style={{
                width: `${Math.min(percentSpent, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-6">
            Spending by Category
          </h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Add costs to itinerary items to see category insights.
            </p>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map(([category, amount]) => {
                const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {category}
                      </span>
                      <span className="text-sm font-normal text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-neutral-400 dark:bg-neutral-600 transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Breakdown */}
        <div>
          <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-6">
            Daily Budgets
          </h3>
          <div className="space-y-3">
            {days.map((day, index) => {
              const dayTotal = day.locations.reduce(
                (total, loc) => total + (loc.cost || 0),
                0
              );
              const planned = day.budget || 0;
              const variance = planned - dayTotal;
              return (
                <div
                  key={day.date}
                  className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Day {index + 1}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {day.locations.length} locations
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:text-right">
                    <div className="flex items-center gap-2 md:justify-end">
                      <label className="text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                        Planned
                      </label>
                      <input
                        type="number"
                        value={Number.isFinite(planned) ? planned : 0}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          if (Number.isNaN(parsed)) return;
                          onUpdateDayBudget(index, parsed);
                        }}
                        onBlur={(e) => {
                          const parsed = Number(e.target.value);
                          if (Number.isNaN(parsed)) return;
                          onPersistDayBudget?.(index, parsed, day.date);
                        }}
                        className="w-28 rounded-lg border border-neutral-200 bg-transparent px-3 py-1 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:text-neutral-200 dark:focus:border-neutral-500 dark:focus:ring-neutral-600"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        Spent {formatCurrency(dayTotal)}
                      </p>
                      <p
                        className={`text-xs ${
                          variance < 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                      >
                        {variance < 0
                          ? `Over by ${formatCurrency(Math.abs(variance))}`
                          : `Remaining ${formatCurrency(variance)}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
