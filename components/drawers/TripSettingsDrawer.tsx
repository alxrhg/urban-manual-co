'use client';

import { useState, useMemo } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Loader2, Globe, Lock, Check, Calendar } from 'lucide-react';
import type { Trip } from '@/types/trip';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
}

type TripStatus = 'planning' | 'upcoming' | 'ongoing' | 'completed';

const STATUS_OPTIONS: { value: TripStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'upcoming', label: 'Upcoming', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'completed', label: 'Completed', color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400' },
];

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

// Calculate trip duration in days
function calculateDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
  return diffDays > 0 ? diffDays : null;
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
  const [description, setDescription] = useState(trip.description || '');
  const [startDate, setStartDate] = useState(formatDateForInput(trip.start_date));
  const [endDate, setEndDate] = useState(formatDateForInput(trip.end_date));
  const [status, setStatus] = useState<TripStatus>(trip.status || 'planning');
  const [isPublic, setIsPublic] = useState(trip.is_public || false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate trip duration
  const duration = useMemo(() => calculateDuration(startDate, endDate), [startDate, endDate]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setSaveSuccess(false);
      const supabase = createClient();
      if (!supabase) return;

      const updates: Partial<Trip> = {
        title,
        description: description || null,
        destination: destination || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        is_public: isPublic,
      };

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      if (onUpdate) onUpdate(updates);
      setSaveSuccess(true);
      setTimeout(() => {
        closeDrawer();
      }, 500);
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
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          Basic Info
        </h3>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
            Trip Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all resize-none"
            placeholder="Add notes about your trip..."
          />
        </div>
      </div>

      {/* Dates Section */}
      <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
        <h3 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          Dates
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
            />
          </div>
        </div>

        {/* Duration Display */}
        {duration && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800/50">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {duration} {duration === 1 ? 'day' : 'days'}
            </span>
          </div>
        )}
      </div>

      {/* Status & Visibility Section */}
      <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
        <h3 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          Status & Visibility
        </h3>

        {/* Status Selector */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
            Trip Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  status === option.value
                    ? `${option.color} ring-2 ring-offset-2 ring-stone-900/20 dark:ring-white/20 dark:ring-offset-stone-900`
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility Toggle */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
            Visibility
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsPublic(false)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !isPublic
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Lock className="w-4 h-4" />
              Private
            </button>
            <button
              onClick={() => setIsPublic(true)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isPublic
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Globe className="w-4 h-4" />
              Public
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
            {isPublic
              ? 'Anyone with the link can view this trip'
              : 'Only you can see this trip'}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className={`w-full py-3 rounded-full text-sm font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
          saveSuccess
            ? 'bg-green-600 text-white'
            : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90'
        }`}
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saveSuccess && <Check className="w-4 h-4" />}
        {saveSuccess ? 'Saved!' : 'Save Changes'}
      </button>

      {/* Delete Section */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Are you sure? This will permanently delete the trip and all its items.
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
