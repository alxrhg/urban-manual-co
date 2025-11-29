/**
 * Cities Dropdown Component
 *
 * Extracted from NavigationRow for better modularity.
 * Provides a dropdown for city selection.
 */

'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { capitalizeCity } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CitiesDropdownProps {
  /** List of available cities */
  cities: string[];
  /** Currently selected city (empty string for "All Cities") */
  selectedCity: string;
  /** Callback when city selection changes */
  onCityChange: (city: string) => void;
  /** Additional class names for the trigger button */
  className?: string;
}

export function CitiesDropdown({
  cities,
  selectedCity,
  onCityChange,
  className,
}: CitiesDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = React.useCallback(
    (city: string) => {
      onCityChange(city);
      setIsOpen(false);
    },
    [onCityChange]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5',
          'bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800',
          'rounded-full text-sm font-medium text-gray-900 dark:text-white',
          'hover:border-gray-300 dark:hover:border-gray-700',
          'transition-all duration-180 whitespace-nowrap',
          className
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{selectedCity ? capitalizeCity(selectedCity) : 'All Cities'}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          strokeWidth={1.5}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute top-full left-0 mt-2 w-48 z-50',
            'bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800',
            'rounded-2xl shadow-lg max-h-64 overflow-y-auto'
          )}
        >
          <button
            role="option"
            aria-selected={!selectedCity}
            onClick={() => handleSelect('')}
            className={cn(
              'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors',
              !selectedCity
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
            )}
          >
            All Cities
          </button>
          {cities.map((city) => (
            <button
              key={city}
              role="option"
              aria-selected={selectedCity === city}
              onClick={() => handleSelect(city === selectedCity ? '' : city)}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors',
                selectedCity === city
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
              )}
            >
              {capitalizeCity(city)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
