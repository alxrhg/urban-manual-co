'use client';

import { useMemo, useState } from 'react';
import { Compass, Hotel, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePlanner } from '@/contexts/PlannerContext';

const FILTERS = [
  { id: 'all', label: 'All', icon: Compass },
  { id: 'activity', label: 'Activities', icon: Compass },
  { id: 'lodging', label: 'Stays', icon: Hotel },
  { id: 'logistics', label: 'Logistics', icon: Truck },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function PlannerSidebar() {
  const { recommendations, recommendationsLoading, refreshRecommendations, itinerary } = usePlanner();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  const filteredRecommendations = useMemo(() => {
    if (activeFilter === 'all') return recommendations;
    return recommendations.filter(item => item.type === activeFilter);
  }, [activeFilter, recommendations]);

  return (
    <aside className="hidden w-[320px] flex-shrink-0 flex-col rounded-3xl border border-neutral-200/70 bg-white/80 p-5 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-900/70 dark:shadow-black/40 xl:flex">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Intelligence suggestions</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Drag to a day to add instantly</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => refreshRecommendations()} disabled={recommendationsLoading}>
          {recommendationsLoading ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        {FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
              activeFilter === filter.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-neutral-200/70 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-800 dark:text-neutral-400'
            }`}
          >
            <filter.icon className="size-3.5" />
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-2">
        {recommendationsLoading && recommendations.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            Fetching smart suggestions…
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            <Compass className="size-6 text-neutral-400" />
            <span>
              Nothing to recommend yet. Try adjusting your destination or refresh suggestions once you add more context.
            </span>
          </div>
        ) : (
          filteredRecommendations.map(recommendation => (
            <div
              key={recommendation.id}
              draggable
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({ type: 'recommendation', recommendation }),
                );
              }}
              className="group rounded-2xl border border-neutral-200/70 bg-white/90 p-4 text-sm shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/80"
            >
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-medium uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                  {recommendation.type}
                </span>
                {recommendation.metadata?.score && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {Math.round(recommendation.metadata.score * 100)}% match
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {recommendation.title}
              </h3>
              {recommendation.summary && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{recommendation.summary}</p>
              )}
              {recommendation.metadata?.location && (
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                  {recommendation.metadata.location.city}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-neutral-200/70 bg-neutral-50/80 p-3 text-[11px] text-neutral-500 dark:border-neutral-800/80 dark:bg-neutral-900/50 dark:text-neutral-400">
        <p className="font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Tip</p>
        <p className="mt-1">
          Drag suggestions into any day, or click refresh to pull the latest intelligence for {itinerary?.destination || 'your trip'}.
        </p>
      </div>
    </aside>
  );
}

export default PlannerSidebar;
