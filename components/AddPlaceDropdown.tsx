'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { capitalizeCity } from '@/lib/utils';

interface AddPlaceDropdownProps {
  onPlaceAdded?: () => void;
}

export function AddPlaceDropdown({ onPlaceAdded }: AddPlaceDropdownProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search destinations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image')
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          setResults(data);
        }
      } catch (error) {
        console.error('Error searching destinations:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddPlace = async (destination: any) => {
    if (!user) return;

    setAdding(destination.slug);
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('visited_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .maybeSingle();

      if (existing) {
        alert('You already marked this place as visited');
        setAdding(null);
        return;
      }

      // Add to visited
      const { error } =         await (supabase
          .from('visited_places')
          .insert as any)({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString()
          });

      if (error) throw error;

      // Success feedback
      setSearchQuery('');
      setResults([]);
      setIsOpen(false);

      if (onPlaceAdded) {
        onPlaceAdded();
      }
    } catch (error) {
      console.error('Error adding place:', error);
      alert('Failed to add place. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Place
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-black dark:focus:border-white text-sm"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Spinner className="size-6 mx-auto text-gray-400" />
                <p className="text-xs text-gray-500 mt-2">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-xs">
                  {searchQuery ? 'No places found' : 'Start typing to search'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {results.map((destination) => (
                  <button
                    key={destination.slug}
                    onClick={() => handleAddPlace(destination)}
                    disabled={adding === destination.slug}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-blue-700 transition-colors text-left disabled:opacity-50"
                  >
                    {/* Image */}
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {destination.image ? (
                        <Image
                          src={destination.image}
                          alt={destination.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-lg">📍</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {destination.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {capitalizeCity(destination.city)} • {destination.category}
                      </div>
                    </div>

                    {/* Add Icon */}
                    {adding === destination.slug ? (
                      <Spinner className="size-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
