/**
 * Category Chips Component
 *
 * Extracted from NavigationRow for better modularity.
 * Provides horizontally scrollable category selection chips.
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { capitalizeCategory } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CategoryChipsProps {
  /** Available categories */
  categories: string[];
  /** Currently selected category */
  selectedCategory: string;
  /** Callback when category changes */
  onCategoryChange: (category: string) => void;
  /** Whether Michelin filter is active */
  isMichelinActive?: boolean;
  /** Callback when Michelin filter changes */
  onMichelinChange?: (active: boolean) => void;
  /** Show Michelin chip */
  showMichelin?: boolean;
  /** Additional class names */
  className?: string;
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function Chip({ selected, onClick, children, className }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'text-xs font-medium whitespace-nowrap transition-all duration-180',
        selected
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
        className
      )}
    >
      {children}
    </button>
  );
}

export function CategoryChips({
  categories,
  selectedCategory,
  onCategoryChange,
  isMichelinActive = false,
  onMichelinChange,
  showMichelin = true,
  className,
}: CategoryChipsProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  // Check if scrolling is needed
  React.useEffect(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      setIsScrollable(scrollWidth > clientWidth);
    }
  }, [categories]);

  const handleAllClick = React.useCallback(() => {
    onCategoryChange('');
    onMichelinChange?.(false);
  }, [onCategoryChange, onMichelinChange]);

  const handleMichelinClick = React.useCallback(() => {
    onCategoryChange('');
    onMichelinChange?.(!isMichelinActive);
  }, [onCategoryChange, onMichelinChange, isMichelinActive]);

  const handleCategoryClick = React.useCallback(
    (category: string) => {
      onCategoryChange(category === selectedCategory ? '' : category);
      onMichelinChange?.(false);
    },
    [onCategoryChange, onMichelinChange, selectedCategory]
  );

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide',
        isScrollable && 'max-w-[300px] md:max-w-none',
        className
      )}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* All chip */}
      <Chip
        selected={!selectedCategory && !isMichelinActive}
        onClick={handleAllClick}
      >
        All
      </Chip>

      {/* Michelin chip */}
      {showMichelin && (
        <Chip selected={isMichelinActive} onClick={handleMichelinClick}>
          <Image
            src="/michelin-star.svg"
            alt="Michelin star"
            width={12}
            height={12}
            className="h-3 w-3"
          />
          Michelin
        </Chip>
      )}

      {/* Category chips */}
      {categories.map((category) => {
        const IconComponent = getCategoryIconComponent(category);
        return (
          <Chip
            key={category}
            selected={selectedCategory === category && !isMichelinActive}
            onClick={() => handleCategoryClick(category)}
          >
            {IconComponent && <IconComponent className="h-3 w-3" size={12} />}
            {capitalizeCategory(category)}
          </Chip>
        );
      })}
    </div>
  );
}
