/**
 * View Mode Toggle Component
 *
 * Extracted from NavigationRow for better modularity.
 * Provides a segmented control for switching between grid and map views.
 */

'use client';

import * as React from 'react';
import { LayoutGrid, Map, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'map' | 'list';

interface ViewModeToggleProps {
  /** Current view mode */
  value: ViewMode;
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void;
  /** Which modes to show */
  modes?: ViewMode[];
  /** Show labels alongside icons */
  showLabels?: boolean;
  /** Additional class names */
  className?: string;
}

const modeConfig: Record<
  ViewMode,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  grid: { icon: LayoutGrid, label: 'Grid' },
  map: { icon: Map, label: 'Map' },
  list: { icon: List, label: 'List' },
};

export function ViewModeToggle({
  value,
  onChange,
  modes = ['grid', 'map'],
  showLabels = true,
  className,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex-shrink-0',
        className
      )}
      role="group"
      aria-label="View mode"
    >
      {modes.map((mode) => {
        const { icon: Icon, label } = modeConfig[mode];
        const isSelected = value === mode;

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium',
              'transition-all rounded-full',
              isSelected
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
            aria-label={`${label} view`}
            aria-pressed={isSelected}
          >
            <Icon className="h-4 w-4" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
