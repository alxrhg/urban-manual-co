'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';

interface MultiCityAutocompleteInputProps {
  value: string[]; // Array of selected cities
  onChange: (cities: string[]) => void;
  placeholder?: string;
  className?: string;
  maxCities?: number;
}

export function MultiCityAutocompleteInput({
  value = [],
  onChange,
  placeholder = 'Add a city...',
  className = '',
  maxCities = 10,
}: MultiCityAutocompleteInputProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewCity, setIsNewCity] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch existing cities on mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cities');
        if (response.ok) {
          const data = await response.json();
          setCities(data.cities || []);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  // Filter cities based on input
  useEffect(() => {
    if (!inputValue) {
      setFilteredCities([]);
      setIsNewCity(false);
      return;
    }

    const searchValue = inputValue.toLowerCase().trim();
    // Filter out already selected cities
    const matches = cities.filter(
      city =>
        city.toLowerCase().includes(searchValue) &&
        !value.some(selected => selected.toLowerCase() === city.toLowerCase())
    );

    setFilteredCities(matches);

    // Check if this is an exact match or a new city
    const exactMatch = cities.some(city => city.toLowerCase() === searchValue);
    const alreadySelected = value.some(city => city.toLowerCase() === searchValue);
    setIsNewCity(!exactMatch && !alreadySelected && searchValue.length > 0);
    setHighlightedIndex(-1);
  }, [inputValue, cities, value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addCity = useCallback(
    (city: string) => {
      const trimmedCity = city.trim();
      if (!trimmedCity) return;
      if (value.length >= maxCities) return;

      // Prevent duplicates (case-insensitive)
      if (value.some(c => c.toLowerCase() === trimmedCity.toLowerCase())) {
        setInputValue('');
        setShowSuggestions(false);
        return;
      }

      onChange([...value, trimmedCity]);
      setInputValue('');
      setShowSuggestions(false);
      setIsNewCity(false);
      inputRef.current?.focus();
    },
    [value, onChange, maxCities]
  );

  const removeCity = useCallback(
    (cityToRemove: string) => {
      onChange(value.filter(c => c !== cityToRemove));
    },
    [value, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredCities.length) {
        addCity(filteredCities[highlightedIndex]);
      } else if (inputValue.trim()) {
        addCity(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredCities.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last city when backspacing on empty input
      removeCity(value[value.length - 1]);
    }
  };

  const handleInputFocus = () => {
    if (inputValue && filteredCities.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Cities Tags */}
      <div
        className={`flex flex-wrap gap-1.5 p-2 border rounded-xl bg-white dark:bg-[#1A1C1F] min-h-[42px] transition-all duration-200 ease-in-out ${
          isNewCity && inputValue
            ? 'border-orange-400 dark:border-orange-500'
            : 'border-stone-200 dark:border-gray-700 focus-within:border-stone-900 dark:focus-within:border-white focus-within:ring-1 focus-within:ring-black/5 dark:focus-within:ring-white/5'
        }`}
      >
        {value.map((city, index) => (
          <span
            key={`${city}-${index}`}
            className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 dark:bg-gray-800 text-stone-900 dark:text-white text-xs rounded-lg"
          >
            {city}
            <button
              type="button"
              onClick={() => removeCity(city)}
              className="p-0.5 hover:bg-stone-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        {value.length < maxCities && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : 'Add another city...'}
            className="flex-1 min-w-[120px] px-1 py-1 bg-transparent text-stone-900 dark:text-white text-sm focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        )}
      </div>

      {/* New City Warning */}
      {isNewCity && inputValue && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-900 dark:text-orange-200">
            <strong>New City:</strong> &quot;{inputValue}&quot; will be added to the
            database. Press Enter to add.
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredCities.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto z-50"
        >
          {filteredCities.slice(0, 10).map((city, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addCity(city)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-2xl last:rounded-b-2xl focus:outline-none ${
                index === highlightedIndex
                  ? 'bg-stone-100 dark:bg-gray-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3 h-3 text-stone-400" />
                {city}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Loading cities...
        </div>
      )}

      {/* Max cities hint */}
      {value.length >= maxCities && (
        <div className="mt-1 text-xs text-stone-400 dark:text-gray-500">
          Maximum {maxCities} cities allowed
        </div>
      )}
    </div>
  );
}
