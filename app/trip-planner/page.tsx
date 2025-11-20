'use client';

import { useCallback, useMemo, useState, type DragEvent } from 'react';
import { CalendarDays, MapPin, Shuffle, Square } from 'lucide-react';
import { PlannerChat } from '@/components/planner/PlannerChat';
import { UnscheduledDock } from '@/components/planner/UnscheduledDock';
import { UnscheduledPlace, UnscheduledProvider } from '@/contexts/UnscheduledContext';

const emptyCanvasMessage = 'Drop any candidate here to start building your day.';

function dedupeCanvas(items: UnscheduledPlace[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.slug || item.id || item.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function TripPlannerDockPage() {
  const [tripContext, setTripContext] = useState<{ location: string; date: string }>(
    { location: 'Tokyo', date: '2025-04-18' }
  );
  const [canvasItems, setCanvasItems] = useState<UnscheduledPlace[]>([]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/json');
    if (!payload) return;
    try {
      const place = JSON.parse(payload) as UnscheduledPlace;
      setCanvasItems((prev) => dedupeCanvas([...prev, place]));
    } catch (error) {
      console.error('Failed to parse dropped item', error);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const formattedDate = useMemo(() => {
    if (!tripContext.date) return 'Flexible date';
    try {
      return new Date(tripContext.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return tripContext.date;
    }
  }, [tripContext.date]);

  return (
    <UnscheduledProvider>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Square className="h-3 w-3" />
              Trip Planner Dock
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conversational filtering for your canvas</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                Ask PlannerChat for places using natural language. Candidates flow into the Unscheduled Dock so you can drag them onto the canvas when you are ready to commit.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div className="flex flex-col w-full">
                  <span className="text-xs text-gray-500">Trip location</span>
                  <input
                    value={tripContext.location}
                    onChange={(event) => setTripContext((prev) => ({ ...prev, location: event.target.value }))}
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                    placeholder="e.g. Tokyo"
                  />
                </div>
              </label>
              <label className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <div className="flex flex-col w-full">
                  <span className="text-xs text-gray-500">Trip date</span>
                  <input
                    type="date"
                    value={tripContext.date}
                    onChange={(event) => setTripContext((prev) => ({ ...prev, date: event.target.value }))}
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start relative">
            <section
              className="min-h-[540px] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/70 backdrop-blur shadow-inner px-6 py-5 flex flex-col gap-4"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Planning canvas</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Drop cards here to build your timeline.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Shuffle className="h-4 w-4" />
                  {formattedDate}
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-gray-100 dark:border-gray-900 bg-white/70 dark:bg-gray-950/60 p-4 space-y-3">
                {canvasItems.length === 0 && (
                  <div className="h-full min-h-[320px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center">
                    {emptyCanvasMessage}
                  </div>
                )}

                {canvasItems.length > 0 && (
                  <ol className="space-y-3">
                    {canvasItems.map((item) => (
                      <li
                        key={item.slug || item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
                      >
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center text-xs font-semibold uppercase">
                          {item.name?.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {item.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.city}
                              </span>
                            )}
                            {item.category && (
                              <span className="inline-flex items-center gap-1">
                                • {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            <UnscheduledDock />
          </div>
        </div>

        <PlannerChat tripContext={tripContext} />
      </main>
    </UnscheduledProvider>
  );
}
