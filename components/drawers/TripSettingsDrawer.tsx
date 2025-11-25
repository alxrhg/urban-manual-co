'use client';

import { useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Loader2 } from 'lucide-react';
import type { Trip } from '@/types/trip';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
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
  const [startDate, setStartDate] = useState(trip.start_date || '');
  const [endDate, setEndDate] = useState(trip.end_date || '');
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

      {/* Destination */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Destination
        </label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          placeholder="e.g. Tokyo, Paris, New York"
        />
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
