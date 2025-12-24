'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  PortfolioFilters as FilterState,
  PROJECT_CATEGORIES,
  PROJECT_LOCATIONS,
  INDUSTRY_TYPES,
  FilterOption,
  ProjectCategory,
  ProjectLocation,
  IndustryType,
  buildFilterPath,
} from '@/types/portfolio';

interface PortfolioFiltersProps {
  filters: FilterState;
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterGroupProps {
  title: string;
  options: readonly FilterOption<string>[];
  selectedValue?: string;
  onSelect: (value: string | undefined) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const FilterGroup = memo(function FilterGroup({
  title,
  options,
  selectedValue,
  onSelect,
  isExpanded,
  onToggle,
}: FilterGroupProps) {
  return (
    <div className="border-b border-[var(--editorial-border)] md:border-b-0 md:border-r last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 md:py-2"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-medium text-[var(--editorial-text-primary)]">
          {title}
          {selectedValue && (
            <span className="ml-2 text-xs text-[var(--editorial-text-secondary)]">
              ({selectedValue})
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transform text-[var(--editorial-text-secondary)] transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1 md:gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(selectedValue === option.value ? undefined : option.value)}
              className={`relative text-sm transition-all duration-200 ${
                selectedValue === option.value
                  ? 'text-[var(--editorial-text-primary)]'
                  : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`absolute -bottom-0.5 left-0 h-px w-full transform bg-current transition-transform duration-200 ${
                  selectedValue === option.value ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export const PortfolioFilters = memo(function PortfolioFilters({
  filters,
  onFilterChange,
}: PortfolioFiltersProps) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['category']));

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const updateFilters = useCallback(
    (newFilters: FilterState) => {
      onFilterChange?.(newFilters);
      const path = buildFilterPath(newFilters);
      router.push(`/portfolio${path}`, { scroll: false });
    },
    [router, onFilterChange]
  );

  const handleCategorySelect = useCallback(
    (value: string | undefined) => {
      updateFilters({ ...filters, category: value as ProjectCategory | undefined });
    },
    [filters, updateFilters]
  );

  const handleLocationSelect = useCallback(
    (value: string | undefined) => {
      updateFilters({ ...filters, location: value as ProjectLocation | undefined });
    },
    [filters, updateFilters]
  );

  const handleIndustrySelect = useCallback(
    (value: string | undefined) => {
      updateFilters({ ...filters, industryType: value as IndustryType | undefined });
    },
    [filters, updateFilters]
  );

  const clearAllFilters = useCallback(() => {
    updateFilters({});
  }, [updateFilters]);

  const hasActiveFilters = filters.category || filters.location || filters.industryType;
  const activeCount = [filters.category, filters.location, filters.industryType].filter(Boolean).length;

  return (
    <div className="mb-8 rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-bg)]">
      {/* Desktop horizontal layout */}
      <div className="hidden md:flex md:items-stretch md:divide-x md:divide-[var(--editorial-border)]">
        <div className="flex flex-1 items-stretch">
          <FilterGroup
            title="Category"
            options={PROJECT_CATEGORIES}
            selectedValue={filters.category}
            onSelect={handleCategorySelect}
            isExpanded={expandedGroups.has('category')}
            onToggle={() => toggleGroup('category')}
          />
          <FilterGroup
            title="Location"
            options={PROJECT_LOCATIONS}
            selectedValue={filters.location}
            onSelect={handleLocationSelect}
            isExpanded={expandedGroups.has('location')}
            onToggle={() => toggleGroup('location')}
          />
          <FilterGroup
            title="Industry Type"
            options={INDUSTRY_TYPES}
            selectedValue={filters.industryType}
            onSelect={handleIndustrySelect}
            isExpanded={expandedGroups.has('industryType')}
            onToggle={() => toggleGroup('industryType')}
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-center px-4">
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-xs text-[var(--editorial-text-secondary)] transition-colors hover:text-[var(--editorial-text-primary)]"
            >
              <span>Clear ({activeCount})</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Mobile vertical layout */}
      <div className="md:hidden">
        <FilterGroup
          title="Category"
          options={PROJECT_CATEGORIES}
          selectedValue={filters.category}
          onSelect={handleCategorySelect}
          isExpanded={expandedGroups.has('category')}
          onToggle={() => toggleGroup('category')}
        />
        <FilterGroup
          title="Location"
          options={PROJECT_LOCATIONS}
          selectedValue={filters.location}
          onSelect={handleLocationSelect}
          isExpanded={expandedGroups.has('location')}
          onToggle={() => toggleGroup('location')}
        />
        <FilterGroup
          title="Industry Type"
          options={INDUSTRY_TYPES}
          selectedValue={filters.industryType}
          onSelect={handleIndustrySelect}
          isExpanded={expandedGroups.has('industryType')}
          onToggle={() => toggleGroup('industryType')}
        />

        {hasActiveFilters && (
          <div className="border-t border-[var(--editorial-border)] px-4 py-3">
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-sm text-[var(--editorial-text-secondary)] transition-colors hover:text-[var(--editorial-text-primary)]"
            >
              <span>Clear all filters ({activeCount})</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PortfolioFilters;
