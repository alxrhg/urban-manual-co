'use client';

import { useMemo } from "react";
import { Calendar, MapPin, MessageSquare, Star } from "lucide-react";
import type { VisitedPlace } from "@/types/common";

interface TravelHistoryProps {
  visitedPlaces: VisitedPlace[];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatCity(city?: string) {
  if (!city) return '';
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function TravelHistory({ visitedPlaces }: TravelHistoryProps) {
  const { groupedHistory, totalEntries } = useMemo(() => {
    const validEntries = visitedPlaces
      .map((place) => {
        const dateString = place.visited_at || place.created_at;
        if (!dateString) return null;

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;

        return {
          date,
          place,
        };
      })
      .filter((entry): entry is { date: Date; place: VisitedPlace } => entry !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const groups = validEntries.reduce<Record<string, { date: Date; place: VisitedPlace }[]>>((acc, entry) => {
      const year = entry.date.getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(entry);
      return acc;
    }, {});

    return {
      groupedHistory: groups,
      totalEntries: validEntries.length,
    };
  }, [visitedPlaces]);

  const years = Object.keys(groupedHistory).sort((a, b) => Number(b) - Number(a));

  if (years.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400">Travel History</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">No travel history yet. Mark places as visited to build your story.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">Travel History</h2>
          <p className="text-xs text-gray-400">{totalEntries} visits tracked</p>
        </div>
      </div>

      <div className="space-y-8">
        {years.map((year) => (
          <div key={year} className="relative pl-5">
            <div className="absolute left-1 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-800" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />
              <h3 className="text-sm font-medium">{year}</h3>
            </div>
            <div className="space-y-4">
              {groupedHistory[year].map(({ date, place }) => (
                <div key={`${place.destination_slug}-${date.toISOString()}`} className="relative pl-4">
                  <div className="absolute left-0 top-2 h-full w-px bg-gray-200 dark:bg-gray-800" />
                  <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(date.toISOString())}</span>
                      </div>
                      {place.rating !== undefined && place.rating !== null && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{place.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium mb-1">{place.destination?.name || 'Visited place'}</div>
                    {place.destination && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <MapPin className="h-3 w-3" />
                        <span>{formatCity(place.destination.city)}</span>
                        {place.destination.country && <span className="text-gray-400">• {place.destination.country}</span>}
                        {place.destination.category && <span className="text-gray-400">• {place.destination.category}</span>}
                      </div>
                    )}
                    {place.notes && (
                      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <MessageSquare className="h-3 w-3 mt-0.5" />
                        <p className="leading-relaxed line-clamp-3">{place.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
