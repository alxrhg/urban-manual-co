'use client';

import { useState, useEffect } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Loader2 } from 'lucide-react';
import type { Trip } from '@/types/trip';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
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
    <div className="p-5 space-y-6">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
          Trip Name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Trip Name"
          className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
          placeholder="Trip name"
        />
      </div>

      {/* Destination with Autocomplete */}
      <div>
        <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
          Destination
        </label>
        <CityAutocompleteInput
          value={destination}
          onChange={setDestination}
          placeholder="e.g. Tokyo, Paris, New York"
          className="w-full"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start Date"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            aria-label="End Date"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className="w-full py-3 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Changes
      </button>

      {/* Delete Section */}
      <div className="pt-6 border-t border-stone-200 dark:border-stone-800">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Are you sure? This will delete the trip and all its items.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-full border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Trip
          </button>
        )}
      </div>
    </div>
  );
}
