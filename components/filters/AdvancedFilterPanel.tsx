'use client';

import { useId } from 'react';
import clsx from 'clsx';
import { AdvancedFilters, BudgetFilterValue, SeasonFilterValue } from '@/types/filters';

interface AdvancedFilterPanelProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: Partial<AdvancedFilters>) => void;
  onReset?: () => void;
  className?: string;
}

const SEASON_OPTIONS: Array<{
  value: SeasonFilterValue;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: 'spring', label: 'Spring bloom', description: 'Cherry blossoms & outdoor terraces', icon: '🌸' },
  { value: 'summer', label: 'Summer vibes', description: 'Rooftops, patios & coastal escapes', icon: '☀️' },
  { value: 'fall', label: 'Autumn mood', description: 'Leaf-peeping, harvest dinners & cozy art', icon: '🍂' },
  { value: 'winter', label: 'Winter glow', description: 'Fireplaces, holiday markets & warm lounges', icon: '❄️' },
];

const BUDGET_OPTIONS: Array<{
  value: BudgetFilterValue;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: 'budget', label: 'Budget-friendly', description: 'Casual picks & exceptional value', icon: '💸' },
  { value: 'midrange', label: 'Mid-range', description: 'Beloved spots without the splurge', icon: '🍽️' },
  { value: 'premium', label: 'Premium', description: 'Statement experiences & luxury stays', icon: '💎' },
];

export function AdvancedFilterPanel({ filters, onFiltersChange, onReset, className }: AdvancedFilterPanelProps) {
  const sectionId = useId();
  const activeSeason = filters.season;
  const activeBudget = filters.budget;

  const handleSeasonSelect = (value: SeasonFilterValue) => {
    onFiltersChange({ season: value === activeSeason ? undefined : value });
  };

  const handleBudgetSelect = (value: BudgetFilterValue) => {
    if (value === activeBudget) {
      onFiltersChange({ budget: undefined, minPrice: undefined, maxPrice: undefined });
      return;
    }

    const range =
      value === 'budget'
        ? { maxPrice: 2 }
        : value === 'midrange'
          ? { minPrice: 2, maxPrice: 3 }
          : { minPrice: 3 };

    onFiltersChange({
      budget: value,
      ...range,
    });
  };

  const handleReset = () => {
    onFiltersChange({ season: undefined, budget: undefined, minPrice: undefined, maxPrice: undefined });
    onReset?.();
  };

  const activeSeasonLabel = activeSeason
    ? SEASON_OPTIONS.find(option => option.value === activeSeason)?.label || 'Seasonal'
    : 'All seasons';
  const activeBudgetLabel = activeBudget
    ? BUDGET_OPTIONS.find(option => option.value === activeBudget)?.label || 'Budget'
    : 'Any budget';

  return (
    <section
      aria-labelledby={`${sectionId}-title`}
      className={clsx(
        'rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/60',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id={`${sectionId}-title`} className="text-sm font-semibold text-gray-900 dark:text-white">
            Contextual filters
          </h2>
          <p className="mt-1 max-w-xl text-xs text-gray-600 dark:text-gray-400">
            Tailor recommendations by seasonality and spend so the suggestions feel instantly relevant.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2" role="list" aria-label="Season and budget filters">
        <fieldset className="rounded-2xl border border-gray-200/60 p-4 dark:border-gray-800/70" role="listitem">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Season
          </legend>
          <div className="mt-3 grid gap-2">
            {SEASON_OPTIONS.map(option => {
              const isActive = activeSeason === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSeasonSelect(option.value)}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900',
                    isActive
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-gray-900'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:hover:border-gray-700',
                  )}
                  aria-pressed={isActive}
                  aria-label={`${option.label}${isActive ? ' selected' : ''}`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-gray-200/60 p-4 dark:border-gray-800/70" role="listitem">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Budget focus
          </legend>
          <div className="mt-3 grid gap-2">
            {BUDGET_OPTIONS.map(option => {
              const isActive = activeBudget === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBudgetSelect(option.value)}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900',
                    isActive
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-gray-900'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:hover:border-gray-700',
                  )}
                  aria-pressed={isActive}
                  aria-label={`${option.label}${isActive ? ' selected' : ''}`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {`Season filter: ${activeSeasonLabel}. Budget filter: ${activeBudgetLabel}.`}
      </div>
    </section>
  );
}
