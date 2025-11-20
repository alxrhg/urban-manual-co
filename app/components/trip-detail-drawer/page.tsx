'use client';

import { useMemo, useState } from 'react';
import { Download, ExternalLink, Share2 } from 'lucide-react';

interface TripDayItem {
  day: string;
  date: string;
  items: string[];
}

const tripDays: TripDayItem[] = [
  {
    day: 'Day 1',
    date: 'Dec 13',
    items: ['Check-in: 11 Howard', 'Lunch: 4 Charles Prime Rib', 'Shopping: Aimé Leon Dore'],
  },
  {
    day: 'Day 2',
    date: 'Dec 14',
    items: ['Coffee: Café Kitsuné', 'Culture: Amant', 'Dinner: Atomix (2★)'],
  },
  {
    day: 'Day 3',
    date: 'Dec 15',
    items: ['Brunch: Barbuto', 'Visit: Apple Fifth Avenue', 'Check-out'],
  },
];

const tripOverview = [
  { label: 'City', value: 'New York' },
  { label: 'Total Days', value: '3' },
  { label: 'Category Focus', value: 'Dining, Hotel, Shopping' },
  { label: 'Saved Places', value: '12 saved so far' },
];

const suggestions = [
  'Top NY Michelin Restaurants',
  'Best Hotels in SoHo',
  'Nightlife Picks for Birthdays',
];

export default function TripDetailDrawerDemo() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const allExpanded = useMemo(
    () => tripDays.every((day) => expandedDays[day.day] !== false),
    [expandedDays],
  );

  const toggleDay = (dayLabel: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayLabel]: prev[dayLabel] === false,
    }));
  };

  const closeDrawer = () => setIsOpen(false);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0B1120] via-[#0D1322] to-[#0A0E19] text-white p-6 flex items-center justify-center">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
        >
          Open Trip Detail Drawer
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/45"
            onClick={closeDrawer}
            aria-label="Close trip drawer"
          />

          <aside className="fixed right-0 top-0 z-50 h-full w-full sm:w-[440px] lg:w-[480px] overflow-y-auto bg-[#0F1624] text-white shadow-2xl">
            <div className="flex h-full flex-col gap-7 px-7 py-7">
              <header className="flex flex-col gap-4 border-b border-white/10 pb-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={closeDrawer}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    ← Back
                  </button>

                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20">
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30">
                      Open Full Trip
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold">Birthday</h1>
                  <p className="text-[15px] text-white/75">December 13–15, 2025</p>
                </div>
              </header>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/60">
                  Trip Overview
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {tripOverview.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                      <span className="text-sm text-white/70">{item.label}</span>
                      <span className="text-sm font-medium text-white/90">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/60">
                    Itinerary
                  </h2>
                  <button
                    onClick={() =>
                      setExpandedDays(
                        allExpanded
                          ? tripDays.reduce((acc, day) => ({ ...acc, [day.day]: false }), {})
                          : tripDays.reduce((acc, day) => ({ ...acc, [day.day]: true }), {}),
                      )
                    }
                    className="text-xs font-medium text-white/70 underline underline-offset-4 transition hover:text-white"
                  >
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>

                <div className="space-y-3">
                  {tripDays.map((day) => {
                    const isExpanded = expandedDays[day.day] !== false;
                    return (
                      <div key={day.day} className="rounded-xl border border-white/5 bg-white/5">
                        <button
                          onClick={() => toggleDay(day.day)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.12em] text-white/50">{day.day}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{day.date}</span>
                              <span className="text-xs text-white/60">{day.items.length} items</span>
                            </div>
                          </div>
                          <span className="text-sm text-white/70">{isExpanded ? '–' : '+'}</span>
                        </button>

                        {isExpanded && (
                          <ul className="space-y-2 border-t border-white/5 px-4 py-3 text-sm text-white/80">
                            {day.items.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 rounded-lg px-2 py-1 hover:bg-white/5"
                              >
                                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/60" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/60">
                  Suggested for This Trip
                </h2>
                <div className="space-y-2">
                  {suggestions.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/90"
                    >
                      <span>{item}</span>
                      <ExternalLink className="h-4 w-4 text-white/60" />
                    </div>
                  ))}
                </div>
              </section>

              <footer className="mt-auto space-y-3 border-t border-white/10 pt-6 text-sm text-white/70">
                <div className="flex flex-col gap-2">
                  <a href="/trip/duplicate" className="transition hover:text-white">
                    Duplicate Trip
                  </a>
                  <a href="/trip/delete" className="transition hover:text-white">
                    Delete Trip
                  </a>
                </div>
              </footer>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
