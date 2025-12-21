'use client';

import { useState, memo } from 'react';
import { ChevronDown, ChevronUp, X, Sparkles, Star, Crown } from 'lucide-react';

export interface BrowseFilters {
  categories: string[];
  minRating: number | null;
  priceLevel: number[] | null;
  special: ('michelin' | 'crown' | 'trending' | 'new')[];
  styles: string[];
}

interface BrowseFilterSidebarProps {
  filters: BrowseFilters;
  onFiltersChange: (filters: BrowseFilters) => void;
  availableCategories: { name: string; count: number }[];
  totalCount: number;
  filteredCount: number;
  className?: string;
}

const STYLE_OPTIONS = [
  'Minimalist',
  'Luxury',
  'Contemporary',
  'Historic',
  'Modern',
  'Industrial',
  'Traditional',
  'Boutique',
];

const SPECIAL_OPTIONS = [
  { value: 'michelin' as const, label: 'Michelin Star', icon: '⭐' },
  { value: 'crown' as const, label: 'Urban Manual Pick', icon: '👑' },
  { value: 'trending' as const, label: 'Trending', icon: '🔥' },
  { value: 'new' as const, label: 'New This Month', icon: '✨' },
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-left"
      >
        <span className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}

export const BrowseFilterSidebar = memo(function BrowseFilterSidebar({
  filters,
  onFiltersChange,
  availableCategories,
  totalCount,
  filteredCount,
  className = '',
}: BrowseFilterSidebarProps) {
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minRating !== null ||
    filters.priceLevel !== null ||
    filters.special.length > 0 ||
    filters.styles.length > 0;

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      minRating: null,
      priceLevel: null,
      special: [],
      styles: [],
    });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const setMinRating = (rating: number | null) => {
    onFiltersChange({ ...filters, minRating: filters.minRating === rating ? null : rating });
  };

  const togglePriceLevel = (level: number) => {
    const currentLevels = filters.priceLevel || [];
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter((l) => l !== level)
      : [...currentLevels, level];
    onFiltersChange({ ...filters, priceLevel: newLevels.length > 0 ? newLevels : null });
  };

  const toggleSpecial = (special: typeof filters.special[number]) => {
    const newSpecial = filters.special.includes(special)
      ? filters.special.filter((s) => s !== special)
      : [...filters.special, special];
    onFiltersChange({ ...filters, special: newSpecial });
  };

  const toggleStyle = (style: string) => {
    const newStyles = filters.styles.includes(style)
      ? filters.styles.filter((s) => s !== style)
      : [...filters.styles, style];
    onFiltersChange({ ...filters, styles: newStyles });
  };

  return (
    <aside className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="mb-6 text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredCount} of {totalCount}
      </div>

      <div className="space-y-4">
        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <FilterSection title="Category">
            <div className="space-y-2">
              {availableCategories.map((cat) => (
                <label
                  key={cat.name}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(cat.name)}
                      onChange={() => toggleCategory(cat.name)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-black dark:focus:ring-white focus:ring-offset-0"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {cat.count}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Price Range */}
        <FilterSection title="Price Range">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => togglePriceLevel(level)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                  filters.priceLevel?.includes(level)
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {'$'.repeat(level)}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection title="Minimum Rating">
          <div className="flex flex-wrap gap-2">
            {[4.5, 4.0, 3.5, 3.0].map((rating) => (
              <button
                key={rating}
                onClick={() => setMinRating(rating)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                  filters.minRating === rating
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Star className="w-3 h-3" />
                {rating}+
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Special */}
        <FilterSection title="Special">
          <div className="space-y-2">
            {SPECIAL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={filters.special.includes(option.value)}
                  onChange={() => toggleSpecial(option.value)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-black dark:focus:ring-white focus:ring-offset-0"
                />
                <span className="mr-1">{option.icon}</span>
                <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Style/Vibe */}
        <FilterSection title="Style" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style}
                onClick={() => toggleStyle(style)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                  filters.styles.includes(style)
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </aside>
  );
});
