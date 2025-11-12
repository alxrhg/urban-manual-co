'use client';

import React from 'react';
import { DollarSignIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  slug?: string;
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
}

export function TripBudgetTracker({
  days,
  totalBudget,
  onUpdateBudget,
}: TripBudgetTrackerProps) {
  const getTotalSpent = () => {
    return days.reduce((total, day) => {
      return (
        total +
        day.locations.reduce((dayTotal, loc) => dayTotal + (loc.cost || 0), 0)
      );
    }, 0);
  };

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, number> = {};

    days.forEach((day) => {
      day.locations.forEach((loc) => {
        if (loc.cost) {
          breakdown[loc.category] = (breakdown[loc.category] || 0) + loc.cost;
        }
      });
    });

    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  };

  const totalSpent = getTotalSpent();
  const remaining = totalBudget - totalSpent;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Overview */}
        <div className="grid grid-cols-3 gap-6">
          <div className="p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Total Budget
            </p>
            <p className="text-3xl font-light text-neutral-900 dark:text-neutral-100 mb-2">
              ${totalBudget.toLocaleString()}
            </p>
          </div>
          <div className="p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
              Spent
            </p>
            <p className="text-3xl font-light text-neutral-900 dark:text-neutral-100 mb-2">
              ${totalSpent.toLocaleString()}
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
                  <TrendingDownIcon className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">
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
              ${Math.abs(remaining).toLocaleString()}
            </p>
          </div>
        </div>

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
          <div className="space-y-4">
            {getCategoryBreakdown().map(([category, amount]) => {
              const percentage =
                totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {category}
                    </span>
                    <span className="text-sm font-normal text-neutral-900 dark:text-neutral-100">
                      ${amount.toLocaleString()}
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
        </div>

        {/* Daily Breakdown */}
        <div>
          <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-6">
            Daily Expenses
          </h3>
          <div className="space-y-3">
            {days.map((day, index) => {
              const dayTotal = day.locations.reduce(
                (total, loc) => total + (loc.cost || 0),
                0
              );
              return (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800"
                >
                  <div>
                    <p className="text-sm text-neutral-900 dark:text-neutral-100 mb-1">
                      Day {index + 1}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-normal text-neutral-900 dark:text-neutral-100">
                      ${dayTotal.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {day.locations.length} locations
                    </p>
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

