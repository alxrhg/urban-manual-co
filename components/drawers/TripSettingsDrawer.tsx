'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Trash2,
  Loader2,
  Globe,
  Lock,
  Check,
  Calendar,
  Camera,
  X,
  AlertTriangle,
  ImageIcon
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
  onClose?: () => void;
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

// Calculate trip duration in days
function calculateDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : null;
}

export default function TripSettingsDrawer({
  trip,
  onUpdate,
  onDelete,
  onClose,
}: TripSettingsDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination || '');
  const [description, setDescription] = useState(trip.description || '');
  const [startDate, setStartDate] = useState(formatDateForInput(trip.start_date));
  const [endDate, setEndDate] = useState(formatDateForInput(trip.end_date));
  const [status, setStatus] = useState<TripStatus>(trip.status || 'planning');
  const [isPublic, setIsPublic] = useState(trip.is_public || false);
  const [coverImage, setCoverImage] = useState(trip.cover_image || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Track original values for change detection
  const originalValues = useRef({
    title: trip.title,
    destination: trip.destination || '',
    description: trip.description || '',
    startDate: formatDateForInput(trip.start_date),
    endDate: formatDateForInput(trip.end_date),
    status: trip.status || 'planning',
    isPublic: trip.is_public || false,
    coverImage: trip.cover_image || '',
  });

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const orig = originalValues.current;
    return (
      title !== orig.title ||
      destination !== orig.destination ||
      description !== orig.description ||
      startDate !== orig.startDate ||
      endDate !== orig.endDate ||
      status !== orig.status ||
      isPublic !== orig.isPublic ||
      coverImage !== orig.coverImage
    );
  }, [title, destination, description, startDate, endDate, status, isPublic, coverImage]);

  // Calculate trip duration
  const duration = useMemo(() => calculateDuration(startDate, endDate), [startDate, endDate]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose?.();
      closeDrawer();
    }
  }, [hasUnsavedChanges, onClose, closeDrawer]);

  // Expose close handler to parent via effect
  useEffect(() => {
    // Store the handler for the drawer wrapper to use
    const handleBeforeClose = (e: CustomEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        setShowUnsavedWarning(true);
      }
    };

    window.addEventListener('drawer-before-close' as any, handleBeforeClose);
    return () => {
      window.removeEventListener('drawer-before-close' as any, handleBeforeClose);
    };
  }, [hasUnsavedChanges]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tripId', trip.id);

      const response = await fetch('/api/upload-trip-cover', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setCoverImage(data.url);
    } catch (err: any) {
      console.error('Upload error:', err);
      setImageError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove cover image
  const handleRemoveImage = () => {
    setCoverImage('');
  };

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
        cover_image: coverImage || null,
      };

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update original values after successful save
      originalValues.current = {
        title,
        destination,
        description,
        startDate,
        endDate,
        status,
        isPublic,
        coverImage,
      };

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

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    onClose?.();
    closeDrawer();
  };

  return (
    <div className="p-5 space-y-6">
      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
                Unsaved Changes
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="flex-1 py-2.5 rounded-full border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscardChanges}
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Image Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          Cover Image
        </h3>

        <div className="relative">
          {coverImage ? (
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
              <Image
                src={coverImage}
                alt="Trip cover"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-2 rounded-full bg-white/90 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 transition-colors shadow-lg"
                  title="Change image"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="p-2 rounded-full bg-white/90 dark:bg-stone-800/90 text-red-600 hover:bg-white dark:hover:bg-stone-700 transition-colors shadow-lg"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all flex flex-col items-center justify-center gap-3"
            >
              {uploadingImage ? (
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              ) : (
                <>
                  <div className="p-3 rounded-full bg-stone-100 dark:bg-stone-700">
                    <ImageIcon className="w-6 h-6 text-stone-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                      Add cover image
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      JPG, PNG up to 5MB
                    </p>
                  </div>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {imageError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {imageError}
            </p>
          )}
        </div>
      </div>

      {/* Basic Info Section */}
      <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
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
      <div className="space-y-3">
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

        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && !saveSuccess && (
          <p className="text-xs text-center text-amber-600 dark:text-amber-400">
            You have unsaved changes
          </p>
        )}
      </div>

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
