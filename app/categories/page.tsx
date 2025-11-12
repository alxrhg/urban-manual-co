'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Compass, Sparkles, Sun, Snowflake } from 'lucide-react';
import { AdvancedFilterPanel } from '@/components/filters/AdvancedFilterPanel';
import { GuidePopover } from '@/components/ui/GuidePopover';
import { CuratedJourneyModule } from '@/components/discovery/CuratedJourneyModule';
import { mapEntryPoints } from '@/components/discovery/entryPoints';
import type { CuratedJourneyItem } from '@/components/discovery/types';
import type { AdvancedFilters } from '@/types/filters';

interface CategorySummary {
  name: string;
  count: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [hasDismissedGuide, setHasDismissedGuide] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to load categories');
        }
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const entryPoints = useMemo(() => mapEntryPoints('categories'), []);

  const curatedModules = useMemo(() => {
    const entryPointItems: CuratedJourneyItem[] = entryPoints.map(entry => ({
      id: entry.id,
      title: entry.label,
      description: entry.description,
      icon:
        entry.type === 'plan' ? (
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Compass className="h-5 w-5" aria-hidden="true" />
        ),
      href: entry.href,
      filters: entry.filters,
      analyticsId: entry.analyticsId,
      actionId: entry.actionId,
      meta: entry.type === 'plan' ? 'Plan' : 'Explore',
    }));

    const seasonalItems: CuratedJourneyItem[] = [
      {
        id: 'seasonal-spring-culture',
        title: 'Spring culture crawls',
        description: 'Art fairs, floral installations, and tasting menus in bloom.',
        icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
        filters: { season: 'spring', budget: 'midrange' },
        analyticsId: 'categories_spring_culture',
        meta: 'Apply filters',
      },
      {
        id: 'seasonal-summer-dining',
        title: 'Summer dining patios',
        description: 'Book breezy terraces and seasonal tasting menus.',
        icon: <Sun className="h-5 w-5" aria-hidden="true" />,
        filters: { season: 'summer', budget: 'premium', category: 'dining' },
        analyticsId: 'categories_summer_dining',
        meta: 'Apply filters',
      },
      {
        id: 'seasonal-winter-cozy',
        title: 'Winter cozy corners',
        description: 'Fire-lit lounges, hot chocolate bars, and snug speakeasies.',
        icon: <Snowflake className="h-5 w-5" aria-hidden="true" />,
        filters: { season: 'winter', budget: 'budget' },
        analyticsId: 'categories_winter_cozy',
        meta: 'Apply filters',
      },
    ];

    return [
      {
        id: 'seasonal-stories',
        title: 'Seasonal journeys',
        description: 'Kick off with a mood-based journey and let filters adapt automatically.',
        layout: 'carousel' as const,
        items: seasonalItems,
      },
      {
        id: 'categories-entry-points',
        title: 'Entry points at a glance',
        description: 'See every Explore or Plan entry point available in the hubs.',
        layout: 'grid' as const,
        items: entryPointItems,
      },
    ];
  }, [entryPoints]);

  const handleFiltersChange = useCallback((updates: Partial<AdvancedFilters>) => {
    setFilters(prev => {
      const next: AdvancedFilters = { ...prev };
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          delete (next as Record<string, unknown>)[key];
        } else {
          (next as Record<string, unknown>)[key] = value;
        }
      });
      return next;
    });
  }, []);

  const handleJourneySelect = useCallback(
    (item: CuratedJourneyItem) => {
      setHasDismissedGuide(true);
      if (item.filters) {
        handleFiltersChange(item.filters);
      }

      if (item.actionId === 'open-weekend-template') {
        router.push('/?journey=weekend-escape');
        return;
      }

      if (item.href) {
        router.push(item.href);
      }
    },
    [handleFiltersChange, router]
  );

  const activeCategory = filters.category?.toLowerCase();

  return (
    <main className="px-6 py-16 md:px-10 lg:px-16" role="main" aria-labelledby="categories-heading">
      <div className="mx-auto max-w-6xl">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">Discover</p>
          <h1 id="categories-heading" className="text-3xl font-semibold text-gray-900 dark:text-white">
            Explore by category
          </h1>
          <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Jump into curated hubs and filters that spotlight seasonal vibes, local gems, and the best ways to plan.
          </p>
        </header>

        <div className="mt-12 space-y-10" aria-label="Category discovery helpers">
          <AdvancedFilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={() =>
              handleFiltersChange({
                season: undefined,
                budget: undefined,
                minPrice: undefined,
                maxPrice: undefined,
              })
            }
          />

          <GuidePopover
            title="New curated journeys"
            description="Use these modules to see every Explore or Plan entry point and activate the right filters instantly."
            defaultOpen={!hasDismissedGuide}
            onDismiss={() => setHasDismissedGuide(true)}
            placement="top-start"
          >
            <div className="space-y-10">
              {curatedModules.map(module => (
                <CuratedJourneyModule
                  key={module.id}
                  id={module.id}
                  title={module.title}
                  description={module.description}
                  layout={module.layout}
                  items={module.items}
                  onItemSelect={handleJourneySelect}
                />
              ))}
            </div>
          </GuidePopover>
        </div>

        <section className="mt-16" aria-labelledby="category-list-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="category-list-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                Browse categories
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading
                  ? 'Loading categories…'
                  : `Showing ${categories.length.toLocaleString()} categories${filters.category ? ' tailored to your filters' : ''}.`}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-3xl border border-gray-200 bg-white/60 dark:border-gray-800 dark:bg-gray-900/60"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
              {categories.map(category => {
                const isActive = activeCategory === category.name.toLowerCase();
                const href = `/search?category=${encodeURIComponent(category.name.toLowerCase())}`;
                return (
                  <li key={category.name}>
                    <Link
                      href={href}
                      className={`flex h-full flex-col justify-between rounded-3xl border p-5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white ${
                        isActive
                          ? 'border-gray-900 bg-gray-900 text-white shadow-md dark:border-white dark:bg-white dark:text-gray-900'
                          : 'border-gray-200 bg-white/80 text-gray-900 hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:hover:border-gray-700'
                      }`}
                      aria-label={`Explore ${category.name}`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{category.name}</p>
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          {category.count.toLocaleString()} destinations tagged
                        </p>
                      </div>
                      <span className="mt-4 inline-flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                        View collection
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
