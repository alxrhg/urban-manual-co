'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, X } from 'lucide-react';

interface Hotel {
  id: number;
  name: string;
  city: string;
  category?: string;
  image?: string | null;
}

interface HotelAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function HotelAutocompleteInput({
  value,
  onChange,
  placeholder = 'Hotel Le Marais',
  disabled = false,
  className = '',
}: HotelAutocompleteInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sync searchQuery with value prop
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Search hotels when query changes
  useEffect(() => {
    const searchHotels = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setFilteredHotels([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;

        // Search destinations with category 'Hotel' or name containing 'hotel'
        // Prioritize hotels by searching for category first, then name matches
        const { data, error } = await supabase
          .from('destinations')
          .select('id, name, city, category, image')
          .or(`category.ilike.%Hotel%,name.ilike.%${searchQuery}%`)
          .order('category', { ascending: true, nullsFirst: false }) // Hotels first
          .limit(20);

        if (error) throw error;
        setFilteredHotels((data as Hotel[]) || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching hotels:', error);
        setFilteredHotels([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchHotels();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    if (newValue.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleSelectHotel = (hotel: Hotel) => {
    onChange(hotel.name);
    setSearchQuery(hotel.name);
    setShowSuggestions(false);
    setFilteredHotels([]);
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
    setShowSuggestions(false);
    setFilteredHotels([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (filteredHotels.length > 0 && searchQuery.length >= 2) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed pr-10 ${className}`}
        />
        {searchQuery && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
            aria-label="Clear"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredHotels.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto"
        >
          {loading && (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}
          {filteredHotels.map((hotel) => (
            <button
              key={hotel.id}
              type="button"
              onClick={() => handleSelectHotel(hotel)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                {hotel.image && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {hotel.name}
                  </p>
                  {hotel.city && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {hotel.city}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

