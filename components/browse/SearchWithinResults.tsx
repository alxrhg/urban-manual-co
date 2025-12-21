'use client';

import { useState, useEffect, memo, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchWithinResultsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  className?: string;
}

export const SearchWithinResults = memo(function SearchWithinResults({
  value,
  onChange,
  placeholder = 'Search within results...',
  resultCount,
  className = '',
}: SearchWithinResultsProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="
            w-full pl-10 pr-10 py-2.5
            text-sm
            bg-gray-100 dark:bg-gray-800
            border border-transparent
            rounded-full
            text-gray-900 dark:text-white
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white
            focus:border-transparent
            transition-all duration-200
          "
          aria-label="Search within results"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Result count indicator */}
      {localValue && typeof resultCount === 'number' && (
        <div className="absolute -bottom-5 left-3 text-xs text-gray-500 dark:text-gray-400">
          {resultCount} {resultCount === 1 ? 'match' : 'matches'}
        </div>
      )}
    </div>
  );
});
