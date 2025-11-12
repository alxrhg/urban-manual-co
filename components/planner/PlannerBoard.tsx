'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanner } from '@/contexts/PlannerContext';
import { PlannerDayColumn } from './PlannerDayColumn';

export function PlannerBoard() {
  const { itinerary, activeDayId, addDay } = usePlanner();

  if (!itinerary) {
    return null;
  }

  return (
    <div className="flex h-full flex-1 gap-4 overflow-x-auto pb-4">
      {itinerary.days.map(day => (
        <PlannerDayColumn key={day.id} day={day} isActive={day.id === activeDayId} />
      ))}
      <div className="flex min-w-[220px] items-center justify-center rounded-3xl border border-dashed border-neutral-200/70 bg-neutral-50/80 p-4 dark:border-neutral-800/70 dark:bg-neutral-900/40">
        <Button variant="ghost" className="flex h-28 w-full flex-col items-center justify-center gap-2 text-neutral-500" onClick={() => addDay()}>
          <Plus className="size-5" />
          Add day
        </Button>
      </div>
    </div>
  );
}

export default PlannerBoard;
