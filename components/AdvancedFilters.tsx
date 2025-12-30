'use client';

import { useState, useCallback } from 'react';
import { X, SlidersHorizontal, Clock, MapPin, Star, DollarSign, Utensils, Volume2, Shirt } from 'lucide-react';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/ui/sheet';
import { Switch } from '@/ui/switch';
import { Label } from '@/ui/label';
import {
  ATMOSPHERE_TAGS,
  BEST_FOR_OPTIONS,
  DIETARY_OPTIONS,
  NOISE_LEVELS,
  DRESS_CODES,
  type AdvancedFilters as AdvancedFiltersType,
} from '@/types/features';

interface AdvancedFiltersProps {
  filters: AdvancedFiltersType;
  onFiltersChange: (filters: AdvancedFiltersType) => void;
  availableCities?: string[];
  availableCategories?: string[];
  className?: string;
}

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];
const MICHELIN_OPTIONS = [1, 2, 3];

export function AdvancedFilters({
  filters,
  onFiltersChange,
  availableCities = [],
  availableCategories = [],
  className = '',
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = useCallback(
    <K extends keyof AdvancedFiltersType>(key: K, value: AdvancedFiltersType[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const toggleArrayFilter = useCallback(
    (key: 'atmosphereTags' | 'bestFor' | 'dietaryOptions' | 'michelinStars' | 'priceLevel', value: string | number) => {
      const currentArray = (filters[key] as (string | number)[] | undefined) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value];
      onFiltersChange({ ...filters, [key]: newArray.length > 0 ? newArray : undefined });
    },
    [filters, onFiltersChange]
  );

  const clearAll = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const clearFilter = useCallback(
    (key: keyof AdvancedFiltersType) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key as keyof AdvancedFiltersType];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    }).length;
  };

  const activeFilterCount = getActiveFilterCount();

  const getFilterBadges = () => {
    const badges: { key: keyof AdvancedFiltersType; label: string }[] = [];

    if (filters.city) badges.push({ key: 'city', label: filters.city });
    if (filters.category) badges.push({ key: 'category', label: filters.category });
    if (filters.minRating) badges.push({ key: 'minRating', label: `${filters.minRating}+ rating` });
    if (filters.michelin) badges.push({ key: 'michelin', label: 'Michelin' });
    if (filters.michelinStars?.length)
      badges.push({ key: 'michelinStars', label: `${filters.michelinStars.join(',')}★` });
    if (filters.crown) badges.push({ key: 'crown', label: 'Crown' });
    if (filters.priceLevel?.length)
      badges.push({ key: 'priceLevel', label: filters.priceLevel.map((p) => PRICE_LABELS[p - 1]).join(',') });
    if (filters.openNow) badges.push({ key: 'openNow', label: 'Open Now' });
    if (filters.atmosphereTags?.length)
      badges.push({ key: 'atmosphereTags', label: `${filters.atmosphereTags.length} vibes` });
    if (filters.dietaryOptions?.length)
      badges.push({ key: 'dietaryOptions', label: `${filters.dietaryOptions.length} dietary` });
    if (filters.bestFor?.length) badges.push({ key: 'bestFor', label: `${filters.bestFor.length} occasions` });
    if (filters.noiseLevel) badges.push({ key: 'noiseLevel', label: filters.noiseLevel });
    if (filters.dressCode) badges.push({ key: 'dressCode', label: filters.dressCode });
    if (filters.distanceKm) badges.push({ key: 'distanceKm', label: `${filters.distanceKm}km` });

    return badges;
  };

  return (
    <div className={className}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="relative w-12 h-12 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
            aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-sm text-gray-500 hover:text-gray-700">
                  Clear all
                </button>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Active Filters Badges */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 py-3 border-b border-gray-200 dark:border-gray-700">
              {getFilterBadges().map(({ key, label }) => (
                <Badge key={key} variant="secondary" className="flex items-center gap-1">
                  {label}
                  <button onClick={() => clearFilter(key)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-6 py-4">
            {/* Location */}
            <section>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>City</Label>
                  <select
                    value={filters.city || ''}
                    onChange={(e) => updateFilter('city', e.target.value || undefined)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Distance (km)</Label>
                  <input
                    type="range"
                    value={filters.distanceKm || 10}
                    onChange={(e) => updateFilter('distanceKm', parseInt(e.target.value))}
                    max={50}
                    min={1}
                    step={1}
                    className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Within {filters.distanceKm || 10} km</p>
                </div>
              </div>
            </section>

            {/* Category */}
            <section>
              <h4 className="font-medium mb-3">Category</h4>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </section>

            {/* Rating & Quality */}
            <section>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" /> Quality
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>Minimum Rating</Label>
                  <input
                    type="range"
                    value={filters.minRating || 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      updateFilter('minRating', v > 0 ? v : undefined);
                    }}
                    max={5}
                    min={0}
                    step={0.5}
                    className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {filters.minRating ? `${filters.minRating}+ stars` : 'Any rating'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Michelin Starred</Label>
                  <Switch checked={filters.michelin || false} onCheckedChange={(v) => updateFilter('michelin', v || undefined)} />
                </div>

                <div>
                  <Label>Michelin Stars</Label>
                  <div className="flex gap-2 mt-2">
                    {MICHELIN_OPTIONS.map((stars) => (
                      <button
                        key={stars}
                        onClick={() => toggleArrayFilter('michelinStars', stars)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          filters.michelinStars?.includes(stars)
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {stars}★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Crown Badge</Label>
                  <Switch checked={filters.crown || false} onCheckedChange={(v) => updateFilter('crown', v || undefined)} />
                </div>
              </div>
            </section>

            {/* Price */}
            <section>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Price Level
              </h4>
              <div className="flex gap-2">
                {PRICE_LABELS.map((label, index) => (
                  <button
                    key={index}
                    onClick={() => toggleArrayFilter('priceLevel', index + 1)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      filters.priceLevel?.includes(index + 1)
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Open Now */}
            <section>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Open Now
                </Label>
                <Switch checked={filters.openNow || false} onCheckedChange={(v) => updateFilter('openNow', v || undefined)} />
              </div>
            </section>

            {/* Atmosphere */}
            <section>
              <h4 className="font-medium mb-3">Atmosphere & Vibe</h4>
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleArrayFilter('atmosphereTags', tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.atmosphereTags?.includes(tag)
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {tag.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </section>

            {/* Best For */}
            <section>
              <h4 className="font-medium mb-3">Best For</h4>
              <div className="flex flex-wrap gap-2">
                {BEST_FOR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleArrayFilter('bestFor', option)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.bestFor?.includes(option)
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </section>

            {/* Dietary */}
            <section>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4" /> Dietary Options
              </h4>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleArrayFilter('dietaryOptions', option)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.dietaryOptions?.includes(option)
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </section>

            {/* Noise Level */}
            <section>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Volume2 className="h-4 w-4" /> Noise Level
              </h4>
              <div className="flex gap-2">
                {NOISE_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => updateFilter('noiseLevel', filters.noiseLevel === level ? undefined : level)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      filters.noiseLevel === level
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </section>

            {/* Dress Code */}
            <section>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Shirt className="h-4 w-4" /> Dress Code
              </h4>
              <div className="flex flex-wrap gap-2">
                {DRESS_CODES.map((code) => (
                  <button
                    key={code}
                    onClick={() => updateFilter('dressCode', filters.dressCode === code ? undefined : code)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.dressCode === code
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {code.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </section>

            {/* Sort */}
            <section>
              <h4 className="font-medium mb-3">Sort By</h4>
              <select
                value={filters.sortBy || 'rating'}
                onChange={(e) => updateFilter('sortBy', e.target.value as AdvancedFiltersType['sortBy'])}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="rating">Highest Rating</option>
                <option value="community_rating">Community Rating</option>
                <option value="newest">Newest</option>
                <option value="trending">Trending</option>
                <option value="saves_count">Most Saved</option>
                <option value="distance">Distance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </section>
          </div>

          <SheetFooter>
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
