"use client";

import { Sparkles, CalendarRange } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <Card className="border-muted/50 bg-gradient-to-br from-white/90 via-white to-white/70 dark:from-white/5 dark:via-white/5 dark:to-white/5 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" />
        <CardTitle className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
          {heading}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {featuredGoals.map(goal => {
            const isActive = goal.id === activeGoalId;
            return (
              <Button
                key={goal.id}
                type="button"
                variant="muted"
                className={cn(
                  "flex h-full flex-col items-start gap-2 rounded-2xl border text-left transition-all",
                  isActive
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white/80 dark:bg-white/10"
                    : "border-transparent bg-white text-neutral-900 shadow-sm hover:border-neutral-200 dark:bg-white/5 dark:text-white"
                )}
                onClick={() => onSelect(goal)}
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
                  {goal.icon ?? <CalendarRange className="h-3.5 w-3.5" />}
                  {goal.label}
                </span>
                <span className="text-sm leading-relaxed text-pretty">
                  {goal.description}
                </span>
              </Button>
            );
          })}
        </div>
        {recentGoalIds.length > 0 && (
          <div className="space-y-2 border-t border-border/70 pt-4">
            <p className="text-[11px] uppercase tracking-[2px] text-muted-foreground">
              Recent intents
            </p>
            <div className="flex flex-wrap gap-2">
              {recentGoalIds.map(id => {
                const goal = goals.find(g => g.id === id);
                if (!goal) return null;
                return (
                  <Button
                    key={goal.id}
                    variant="pill"
                    size="xs"
                    onClick={() => onSelect(goal)}
                    className="border-border/70 text-muted-foreground hover:text-foreground"
                  >
                    {goal.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

