"use client";

import { Clock, MapPin, Compass, PlayCircle } from "lucide-react";
import type { JourneyGoal } from "@/components/journey/GoalPicker";

interface JourneyContextRailProps {
  intents: JourneyGoal[];
  onIntentSelect: (goal: JourneyGoal) => void;
  activeGoalId?: string | null;
  recentIntents?: string[];
  selectedCity?: string;
  selectedCategory?: string;
  lastSession?: {
    id: string;
    last_activity: string;
    context_summary?: {
      city?: string;
      category?: string;
      lastQuery?: string;
    };
  } | null;
  onResumeSession?: (sessionId: string) => void;
  stats?: {
    visited?: number;
    saved?: number;
    trips?: number;
  };
}

export function JourneyContextRail({
  intents,
  onIntentSelect,
  activeGoalId,
  recentIntents = [],
  selectedCity,
  selectedCategory,
  lastSession,
  onResumeSession,
  stats,
}: JourneyContextRailProps) {
  return (
    <div className="sticky top-32 space-y-6">
      <ContextCard title="Intent shortcuts">
        <div className="flex flex-wrap gap-2">
          {intents.map(goal => (
            <button
              key={goal.id}
              onClick={() => onIntentSelect(goal)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                activeGoalId === goal.id
                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white/10 dark:text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-900/70 dark:border-white/10 dark:text-gray-300 dark:hover:border-white/40"
              }`}
            >
              {goal.label}
            </button>
          ))}
        </div>
        {recentIntents.length > 0 && (
          <div className="mt-4 text-[11px] uppercase tracking-[2px] text-gray-400">
            Recent:{" "}
            {recentIntents
              .map(id => intents.find(goal => goal.id === id)?.label)
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </ContextCard>

      {lastSession && (
        <ContextCard title="Resume planning" icon={<Clock className="h-4 w-4" />}>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Continue where you left off in{" "}
            {lastSession.context_summary?.city || "your last session"}.
          </p>
          <button
            onClick={() => onResumeSession?.(lastSession.id)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-900 px-4 py-2 text-xs font-semibold uppercase tracking-[1.5px] text-gray-900 transition-colors hover:bg-gray-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-gray-900"
          >
            <PlayCircle className="h-4 w-4" />
            Resume plan
          </button>
        </ContextCard>
      )}

      <ContextCard title="Filters in focus">
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-[11px] uppercase tracking-[2px] text-gray-400">City</p>
              <p>{selectedCity ? selectedCity : "All cities"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-[11px] uppercase tracking-[2px] text-gray-400">Category</p>
              <p>{selectedCategory ? selectedCategory : "All categories"}</p>
            </div>
          </div>
        </div>
      </ContextCard>

      {stats && (
        <ContextCard title="Your momentum">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Visited" value={stats.visited ?? 0} />
            <Stat label="Saved" value={stats.saved ?? 0} />
            <Stat label="Trips" value={stats.trips ?? 0} />
          </div>
        </ContextCard>
      )}
    </div>
  );
}

function ContextCard({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.6)]">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400 font-medium">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 px-2 py-3">
      <div className="text-2xl font-light text-gray-900 dark:text-white">{value}</div>
      <div className="text-[11px] uppercase tracking-[2px] text-gray-400 mt-1">{label}</div>
    </div>
  );
}

