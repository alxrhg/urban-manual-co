'use client';

import { useState, useEffect, useRef } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Loader2, MapPin } from 'lucide-react';
import type { Trip } from '@/types/trip';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
}

interface CitySuggestion {
  city: string;
  country: string | null;
  count: number;
}

// Format date string for HTML date input (YYYY-MM-DD format)
function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Parse date string directly to avoid timezone issues
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const year = parts[0].length === 4 ? parts[0] : parts[2];
      const month = parts[0].length === 4 ? parts[1] : parts[0];
      const day = parts[0].length === 4 ? parts[2] : parts[1];
      // Validate and format
      if (year.length === 4 && month.length <= 2 && day.length <= 2) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    // Fallback: parse as Date and use local date components
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  } catch {
    return '';
  }
}

export default function TripSettingsDrawer({
  trip,
  onUpdate,
  onDelete,
}: TripSettingsDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const { user } = useAuth();
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination || '');
  const [startDate, setStartDate] = useState(formatDateForInput(trip.start_date));
  const [endDate, setEndDate] = useState(formatDateForInput(trip.end_date));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // City autocomplete state
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch city suggestions
  useEffect(() => {
    const fetchCities = async () => {
      if (!destination || destination.length < 2) {
        setCitySuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const supabase = createClient();
        if (!supabase) return;

        // Get unique cities from destinations table
        const { data, error } = await supabase
          .from('destinations')
          .select('city, country')
          .ilike('city', `%${destination}%`)
          .limit(50);

        if (error) throw error;

        // Group by city and count
        const cityMap = new Map<string, CitySuggestion>();
        data?.forEach((d) => {
          const key = d.city.toLowerCase();
          if (cityMap.has(key)) {
            cityMap.get(key)!.count++;
          } else {
            cityMap.set(key, {
              city: d.city,
              country: d.country,
              count: 1,
            });
          }
        });

        // Convert to array and sort by count
        const suggestions = Array.from(cityMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setCitySuggestions(suggestions);
      } catch (err) {
        console.error('Error fetching cities:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchCities, 200);
    return () => clearTimeout(debounce);
  }, [destination]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (city: string) => {
    setDestination(city);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const updates: Partial<Trip> = {
        title,
        destination: destination || null,
        start_date: startDate || null,
        end_date: endDate || null,
      };

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      if (onUpdate) onUpdate(updates);
      closeDrawer();
    } catch (err) {
      console.error('Error saving trip:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      setDeleting(true);
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      closeDrawer();
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Error deleting trip:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Trip Name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          placeholder="Trip name"
        />
      </div>

      {/* Destination with Autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Destination
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            placeholder="e.g. Tokyo, Paris, New York"
            autoComplete="off"
          />
          {loadingSuggestions && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && citySuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden"
          >
            {citySuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.city}-${index}`}
                onClick={() => handleSelectCity(suggestion.city)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
              >
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-neutral-900 dark:text-white">
                    {suggestion.city}
                  </span>
                  {suggestion.country && (
                    <span className="text-xs text-neutral-500 ml-2">
                      {suggestion.country}
                    </span>
                  )}
                </div>
                <span className="text-xs text-neutral-400">
                  {suggestion.count} {suggestion.count === 1 ? 'place' : 'places'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Changes
      </button>

      {/* Delete Section */}
      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Are you sure? This will delete the trip and all its items.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete Trip
          </button>
        )}
      </div>
    </div>
  );
}
