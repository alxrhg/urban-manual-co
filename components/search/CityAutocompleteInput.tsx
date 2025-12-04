'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface CityAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function CityAutocompleteInput({
  value,
  onChange,
  placeholder = 'Tokyo',
  required = false,
  className = '',
}: CityAutocompleteInputProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewCity, setIsNewCity] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Handle input change and filter cities
  useEffect(() => {
    if (!value) {
      setFilteredCities([]);
      setIsNewCity(false);
      return;
    }

    const inputValue = value.toLowerCase().trim();
    const matches = cities.filter(city =>
      city.toLowerCase().includes(inputValue)
    );

    setFilteredCities(matches);
    
    // Check if this is an exact match or a new city
    const exactMatch = cities.some(city => city.toLowerCase() === inputValue);
    setIsNewCity(!exactMatch && inputValue.length > 0);
  }, [value, cities]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectCity = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
    setIsNewCity(false);
  };

  const handleInputFocus = () => {
    if (value && filteredCities.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-2 border rounded-xl bg-white dark:bg-[#1A1C1F] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all duration-200 ease-in-out text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 ${
          isNewCity
            ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/20'
            : ''
        } ${className}`}
      />
      
      {isNewCity && value && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-900 dark:text-orange-200">
            <strong>New City:</strong> &quot;{value}&quot; will be added to the database.
          </div>
        </div>
      )}

      {showSuggestions && filteredCities.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto z-50"
        >
          {filteredCities.slice(0, 10).map((city, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectCity(city)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800"
            >
              {city}
            </button>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Loading cities...
        </div>
      )}
    </div>
  );
}
