'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Trash2, Loader2, X } from 'lucide-react';
import type { Trip } from '@/types/trip';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';

interface TripSettingsBoxProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  className?: string;
}

// Format date string for HTML date input (YYYY-MM-DD format)
function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const year = parts[0].length === 4 ? parts[0] : parts[2];
      const month = parts[0].length === 4 ? parts[1] : parts[0];
      const day = parts[0].length === 4 ? parts[2] : parts[1];
      if (year.length === 4 && month.length <= 2 && day.length <= 2) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
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

/**
 * TripSettingsBox - Inline trip settings component
 * Shows when settings button is tapped, replacing sidebar content temporarily
 */
export default function TripSettingsBox({
  trip,
  onUpdate,
  onDelete,
  onClose,
  className = '',
}: TripSettingsBoxProps) {
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
      if (onClose) onClose();
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

      if (onDelete) onDelete();
    } catch (err) {
      console.error('Error deleting trip:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Trip Settings
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Trip Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition-all"
            placeholder="Trip name"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Destination
          </label>
          <CityAutocompleteInput
            value={destination}
            onChange={setDestination}
            placeholder="e.g. Tokyo, Paris"
            className="w-full"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition-all"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>

        {/* Delete Section */}
        <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
          {showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 dark:text-gray-400">
                Delete this trip and all its items?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-full border border-stone-200 dark:border-gray-700 text-xs font-medium text-stone-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-full bg-red-600 text-white text-xs font-medium disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Trip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
