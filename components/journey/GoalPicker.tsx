"use client";

import { Sparkles, CalendarRange } from "lucide-react";
import type { ReactNode } from "react";

export interface JourneyGoal {
  id: string;
  label: string;
  description: string;
  query: string;
  icon?: ReactNode;
}

interface GoalPickerProps {
  goals: JourneyGoal[];
  onSelect: (goal: JourneyGoal) => void;
  activeGoalId?: string | null;
  recentGoalIds?: string[];
  heading?: string;
}

export function GoalPicker({
  goals,
  onSelect,
  activeGoalId,
  recentGoalIds = [],
  heading = "What do we plan next?",
}: GoalPickerProps) {
  const featuredGoals = goals.slice(0, 4);

  return (
    <div className="rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-lg p-4 md:p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400 font-medium mb-4">
        <Sparkles className="h-3.5 w-3.5 text-gray-800 dark:text-white" />
        {heading}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {featuredGoals.map(goal => {
          const isActive = goal.id === activeGoalId;
          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal)}
              className={`group flex h-full flex-col rounded-2xl border px-4 py-3 text-left transition-all ${
                isActive
                  ? "border-gray-900 dark:border-white bg-gray-900 text-white dark:bg-white/10"
                  : "border-gray-200/70 dark:border-white/10 hover:border-gray-900/60 dark:hover:border-white/40"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">
                {goal.icon ?? <CalendarRange className="h-3.5 w-3.5" />}
                {goal.label}
              </div>
              <p
                className={`text-sm leading-relaxed ${
                  isActive
                    ? "text-white/90 dark:text-white"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {goal.description}
              </p>
            </button>
          );
        })}
      </div>
      {recentGoalIds.length > 0 && (
        <div className="mt-4 border-t border-gray-200/70 dark:border-white/10 pt-4">
          <p className="text-[11px] uppercase tracking-[2px] text-gray-400 mb-2">
            Recent intents
          </p>
          <div className="flex flex-wrap gap-2">
            {recentGoalIds.map(id => {
              const goal = goals.find(goal => goal.id === id);
              if (!goal) return null;
              return (
                <button
                  key={goal.id}
                  onClick={() => onSelect(goal)}
                  className="px-3 py-1.5 rounded-full border border-gray-200/70 dark:border-white/10 text-xs text-gray-600 dark:text-gray-200 hover:border-gray-900 dark:hover:border-white/40 transition-colors"
                >
                  {goal.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

