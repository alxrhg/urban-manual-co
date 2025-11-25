'use client';

import { Compass, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { TravelIntelligenceSummary } from '@/types/intelligence';

interface TravelIntelligencePanelProps {
  summary: TravelIntelligenceSummary;
  onRefine?: (value: string) => void;
}

export function TravelIntelligencePanel({
  summary,
  onRefine,
}: TravelIntelligencePanelProps) {
  if (!summary) {
    return null;
  }

  const categories = summary.topCategories || [];
  const neighborhoods = summary.neighborhoods || [];
  const stats = summary.stats || [];
  const highlights = summary.highlights || [];

  const handleRefine = (value: string) => {
    if (!value) return;
    onRefine?.(value);
  };

  return (
    <div className="mb-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/60 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.15)] backdrop-blur">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
        <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        Travel Intelligence
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
        {summary.statement}
      </p>

      {stats.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {stats.slice(0, 3).map(stat => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {stat.value}
              </p>
              {stat.helper && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {stat.helper}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Focus
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.label}
                onClick={() =>
                  handleRefine(
                    `${summary.city ? `${summary.city} ` : ''}${category.label}`.trim()
                  )
                }
                className="rounded-full border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-800/70 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 transition"
              >
                {category.label} · {category.count}
              </button>
            ))}
          </div>
        </div>
      )}

      {neighborhoods.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
            <MapPin className="h-3.5 w-3.5" />
            Neighborhoods
          </div>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map(neighborhood => (
              <span
                key={neighborhood.label}
                className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
              >
                {neighborhood.label}
                {neighborhood.count > 1 ? ` (${neighborhood.count})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="mt-6 border-t border-gray-200/80 dark:border-gray-800/80 pt-4 space-y-3">
          {highlights.map(highlight => (
            <div key={highlight.title} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Compass className="h-4 w-4 text-gray-400" />
                {highlight.title}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {highlight.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
