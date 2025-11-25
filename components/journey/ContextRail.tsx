"use client";

import { Clock, MapPin, Compass, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
            <Button
              key={goal.id}
              variant="pill"
              size="xs"
              className={cn(
                "border border-transparent text-muted-foreground",
                activeGoalId === goal.id &&
                  "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white/10"
              )}
              onClick={() => onIntentSelect(goal)}
            >
              {goal.label}
            </Button>
          ))}
        </div>
        {recentIntents.length > 0 && (
          <p className="mt-4 text-[11px] uppercase tracking-[2px] text-muted-foreground">
            Recent:{" "}
            {recentIntents
              .map(id => intents.find(goal => goal.id === id)?.label)
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </ContextCard>

      {lastSession && (
        <ContextCard title="Resume planning" icon={<Clock className="h-4 w-4" />}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Continue where you left off in{" "}
            {lastSession.context_summary?.city || "your last session"}.
          </p>
          <Button
            onClick={() => onResumeSession?.(lastSession.id)}
            variant="default"
            size="sm"
            className="mt-4 rounded-full px-5 text-xs uppercase tracking-[1.5px]"
          >
            <PlayCircle className="h-4 w-4" />
            Resume plan
          </Button>
        </ContextCard>
      )}

      <ContextCard title="Filters in focus">
        <div className="space-y-3 text-sm text-muted-foreground">
          <FilterRow
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            label="City"
            value={selectedCity || "All cities"}
          />
          <FilterRow
            icon={<Compass className="h-4 w-4 text-muted-foreground" />}
            label="Category"
            value={selectedCategory || "All categories"}
          />
        </div>
      </ContextCard>

      {stats && (
        <ContextCard title="Your momentum">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Visited" value={stats.visited ?? 0} />
            <StatCard label="Saved" value={stats.saved ?? 0} />
            <StatCard label="Trips" value={stats.trips ?? 0} />
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
    <Card className="border-border/70 bg-white/90 dark:bg-white/5 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        {icon}
        <CardTitle className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FilterRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[11px] uppercase tracking-[2px] text-muted-foreground">
          {label}
        </p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border border-border/70 bg-gradient-to-br from-white to-white/80 dark:from-white/5 dark:to-white/10">
      <CardContent className="px-4 py-4 text-center">
        <p className="text-2xl font-light text-foreground">{value}</p>
        <p className="text-[11px] uppercase tracking-[2px] text-muted-foreground mt-1">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

