'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import Image from 'next/image';

interface Destination {
  id: number;
  name: string;
  city: string;
  category: string;
  image?: string | null;
}

interface ParentDestinationAutocompleteInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  currentDestinationId?: number; // Prevent selecting self as parent
  placeholder?: string;
  className?: string;
}

export function ParentDestinationAutocompleteInput({
  value,
  onChange,
  currentDestinationId,
  placeholder = 'Search for parent location (e.g., hotel, building)...',
  className = '',
}: ParentDestinationAutocompleteInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load selected destination when value changes
  useEffect(() => {
    const loadSelectedDestination = async () => {
      if (!value) {
        setSelectedDestination(null);
        setSearchQuery('');
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('destinations')
          .select('id, name, city, category, image')
          .eq('id', value)
          .single();

        if (error) throw error;
        if (data) {
          setSelectedDestination(data as Destination);
          setSearchQuery(`${data.name} (${data.city})`);
        }
      } catch (error) {
        console.error('Error loading selected destination:', error);
      }
    };

    loadSelectedDestination();
  }, [value]);

  // Search destinations when query changes
  useEffect(() => {
    const searchDestinations = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setFilteredDestinations([]);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        let query = supabase
          .from('destinations')
          .select('id, name, city, category, image')
          .ilike('name', `%${searchQuery}%`)
          .limit(20);

        // Exclude current destination if editing
        if (currentDestinationId) {
          query = query.neq('id', currentDestinationId);
        }

        // Exclude destinations that already have a parent (can't be nested twice)
        query = query.is('parent_destination_id', null);

        const { data, error } = await query;

        if (error) throw error;
        setFilteredDestinations((data as Destination[]) || []);
      } catch (error) {
        console.error('Error searching destinations:', error);
        setFilteredDestinations([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchDestinations();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentDestinationId]);

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
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
    if (!e.target.value) {
      onChange(null);
      setSelectedDestination(null);
    }
  };

  const handleSelectDestination = (destination: Destination) => {
    onChange(destination.id);
    setSelectedDestination(destination);
    setSearchQuery(`${destination.name} (${destination.city})`);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onChange(null);
    setSelectedDestination(null);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (searchQuery && filteredDestinations.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all duration-200 ease-in-out text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 ${className}`}
        />
        {selectedDestination && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear selection"
          >
            <span className="text-xs">✕</span>
          </button>
        )}
      </div>

      {showSuggestions && (filteredDestinations.length > 0 || loading) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto z-50"
        >
          {loading ? (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No destinations found
            </div>
          ) : (
            filteredDestinations.map((destination) => (
              <button
                key={destination.id}
                type="button"
                onClick={() => handleSelectDestination(destination)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800 flex items-center gap-3"
              >
                {destination.image ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {destination.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {destination.city} · {destination.category}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

