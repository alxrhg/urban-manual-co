'use client';

import { useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Trash2,
  Loader2,
  Globe,
  Lock,
  Users,
  Wallet,
  Clock,
  ImageIcon,
  Sparkles,
  ChevronDown,
  Check,
  Plane,
  Utensils,
  Mountain,
  Building2,
  Heart,
  Camera
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';

interface TripSettingsDrawerProps {
  trip: Trip;
  onUpdate?: (updates: Partial<Trip>) => void;
  onDelete?: () => void;
}

// Trip status options with styling
const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500', description: 'Still planning details' },
  { value: 'upcoming', label: 'Upcoming', color: 'bg-amber-500', description: 'Trip is booked' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-green-500', description: 'Currently traveling' },
  { value: 'completed', label: 'Completed', color: 'bg-neutral-400', description: 'Trip finished' },
] as const;

// Travel style tags
const TRAVEL_STYLES = [
  { id: 'luxury', label: 'Luxury', icon: Sparkles },
  { id: 'adventure', label: 'Adventure', icon: Mountain },
  { id: 'foodie', label: 'Foodie', icon: Utensils },
  { id: 'cultural', label: 'Cultural', icon: Building2 },
  { id: 'romantic', label: 'Romantic', icon: Heart },
  { id: 'photography', label: 'Photography', icon: Camera },
] as const;

// Budget levels
const BUDGET_LEVELS = [
  { value: 'budget', label: 'Budget', description: '$' },
  { value: 'moderate', label: 'Moderate', description: '$$' },
  { value: 'luxury', label: 'Luxury', description: '$$$' },
  { value: 'ultra', label: 'Ultra Luxury', description: '$$$$' },
] as const;

// Pace options
const PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed', description: '2-3 activities/day' },
  { value: 'moderate', label: 'Moderate', description: '4-5 activities/day' },
  { value: 'packed', label: 'Packed', description: '6+ activities/day' },
] as const;

// Parse trip metadata from notes
function parseTripMetadata(notes: string | null): TripMetadata {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed.metadata || {};
  } catch {
    return {};
  }
}

// Merge metadata back into notes
function mergeTripMetadata(notes: string | null, metadata: TripMetadata): string {
  try {
    const parsed = notes ? JSON.parse(notes) : {};
    return JSON.stringify({ ...parsed, metadata });
  } catch {
    return JSON.stringify({ metadata });
  }
}

interface TripMetadata {
  travelers?: number;
  budgetLevel?: string;
  pace?: string;
  travelStyles?: string[];
  timezone?: string;
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

  // Basic info
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description || '');
  const [destination, setDestination] = useState(trip.destination || '');
  const [startDate, setStartDate] = useState(formatDateForInput(trip.start_date));
  const [endDate, setEndDate] = useState(formatDateForInput(trip.end_date));
  const [status, setStatus] = useState<Trip['status']>(trip.status);
  const [isPublic, setIsPublic] = useState(trip.is_public);
  const [coverImage, setCoverImage] = useState(trip.cover_image || '');

  // Trip metadata
  const initialMetadata = parseTripMetadata(trip.notes);
  const [travelers, setTravelers] = useState(initialMetadata.travelers || 1);
  const [budgetLevel, setBudgetLevel] = useState(initialMetadata.budgetLevel || 'moderate');
  const [pace, setPace] = useState(initialMetadata.pace || 'moderate');
  const [travelStyles, setTravelStyles] = useState<string[]>(initialMetadata.travelStyles || []);

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const toggleTravelStyle = (styleId: string) => {
    setTravelStyles(prev =>
      prev.includes(styleId)
        ? prev.filter(s => s !== styleId)
        : [...prev, styleId]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      // Build metadata
      const metadata: TripMetadata = {
        travelers,
        budgetLevel,
        pace,
        travelStyles,
      };

      // Merge metadata into existing notes
      const updatedNotes = mergeTripMetadata(trip.notes, metadata);

      const updates: Partial<Trip> = {
        title,
        description: description || null,
        destination: destination || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        is_public: isPublic,
        cover_image: coverImage || null,
        notes: updatedNotes,
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

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Cover Image Preview */}
          {coverImage && (
            <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              <img
                src={coverImage}
                alt="Trip cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <button
                onClick={() => setCoverImage('')}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Trip Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Trip Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
              placeholder="My Amazing Trip"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow resize-none"
              placeholder="A short description of your trip..."
            />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
              />
            </div>
          </div>

          {/* Status & Visibility Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Status Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Status
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-left flex items-center gap-2 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${currentStatus?.color}`} />
                  <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-white">
                    {currentStatus?.label}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showStatusDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 py-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setStatus(option.value);
                          setShowStatusDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full ${option.color}`} />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">{option.label}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">{option.description}</div>
                        </div>
                        {status === option.value && (
                          <Check className="w-4 h-4 text-neutral-900 dark:text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Visibility
              </label>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full px-4 py-3 rounded-xl border flex items-center gap-2 transition-all ${
                  isPublic
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50'
                }`}
              >
                {isPublic ? (
                  <>
                    <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Private</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Cover Image
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-shadow"
                  placeholder="Image URL..."
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-900 uppercase tracking-wider">
                Trip Preferences
              </span>
            </div>
          </div>

          {/* Travelers */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Travelers
            </label>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-neutral-400" />
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                  className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-lg font-medium"
                >
                  −
                </button>
                <span className="w-12 text-center text-lg font-semibold text-neutral-900 dark:text-white">
                  {travelers}
                </span>
                <button
                  onClick={() => setTravelers(travelers + 1)}
                  className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-lg font-medium"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {travelers === 1 ? 'Solo' : travelers === 2 ? 'Couple' : 'Group'}
              </span>
            </div>
          </div>

          {/* Budget Level */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Budget Level
            </label>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-4 gap-1.5">
                {BUDGET_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setBudgetLevel(level.value)}
                    className={`px-3 py-2.5 rounded-xl text-center transition-all ${
                      budgetLevel === level.value
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pace */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Trip Pace
            </label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-3 gap-1.5">
                {PACE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPace(option.value)}
                    className={`px-3 py-2.5 rounded-xl text-center transition-all ${
                      pace === option.value
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Travel Style Tags */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Travel Style
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map((style) => {
                const Icon = style.icon;
                const isSelected = travelStyles.includes(style.id);
                return (
                  <button
                    key={style.id}
                    onClick={() => toggleTravelStyle(style.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delete Section */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            {showDeleteConfirm ? (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 space-y-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Are you sure? This will permanently delete the trip and all its items.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Delete Forever
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Trip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full py-3.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-sm"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
