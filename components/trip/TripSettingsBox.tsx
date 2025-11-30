'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Trash2, Loader2, X, ImagePlus, Smile } from 'lucide-react';
import Image from 'next/image';
import type { Trip } from '@/types/trip';
import { parseDestinations, stringifyDestinations } from '@/types/trip';
import { MultiCityAutocompleteInput } from '@/components/MultiCityAutocompleteInput';

// Common travel-related emojis
const TRIP_EMOJIS = [
  '✈️', '🌍', '🏖️', '🏔️', '🌆', '🗼', '🏛️', '🎭',
  '🍽️', '🍷', '☕', '🛍️', '🎪', '🎨', '🎵', '🏄',
  '⛷️', '🚗', '🚂', '🚢', '🏕️', '🌴', '🌸', '❄️',
  '🌅', '🌙', '💼', '💑', '👨‍👩‍👧‍👦', '🎒', '📸', '🗺️',
];

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
// Extract emoji from beginning of title if present
function extractEmoji(title: string): { emoji: string | null; text: string } {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u;
  const match = title.match(emojiRegex);
  if (match) {
    return { emoji: match[0], text: title.slice(match[0].length).trim() };
  }
  return { emoji: null, text: title };
}

export default function TripSettingsBox({
  trip,
  onUpdate,
  onDelete,
  onClose,
  className = '',
}: TripSettingsBoxProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse emoji from title
  const { emoji: initialEmoji, text: initialText } = extractEmoji(trip.title);

  const [tripEmoji, setTripEmoji] = useState<string | null>(initialEmoji);
  const [title, setTitle] = useState(initialText);
  const [destinations, setDestinations] = useState<string[]>(parseDestinations(trip.destination));
  const [startDate, setStartDate] = useState(formatDateForInput(trip.start_date));
  const [endDate, setEndDate] = useState(formatDateForInput(trip.end_date));
  const [coverImage, setCoverImage] = useState(trip.cover_image || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      // Combine emoji and title
      const fullTitle = tripEmoji ? `${tripEmoji} ${title}` : title;

      const updates: Partial<Trip> = {
        title: fullTitle,
        destination: stringifyDestinations(destinations),
        start_date: startDate || null,
        end_date: endDate || null,
        cover_image: coverImage || null,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const supabase = createClient();
      if (!supabase) return;

      // Create unique filename
      const ext = file.name.split('.').pop();
      const filename = `${trip.id}-${Date.now()}.${ext}`;
      const filePath = `trip-covers/${user.id}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setCoverImage(urlData.publicUrl);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverImage('');
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
        {/* Cover Photo */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Cover Photo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {coverImage ? (
            <div className="relative w-full h-32 rounded-xl overflow-hidden group">
              <Image
                src={coverImage}
                alt="Trip cover"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3 py-1.5 bg-white/90 text-stone-900 text-xs font-medium rounded-full hover:bg-white transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={handleRemoveCover}
                  className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded-full hover:bg-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full h-24 border-2 border-dashed border-stone-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-stone-400 dark:text-gray-500 hover:border-stone-300 dark:hover:border-gray-600 hover:text-stone-500 dark:hover:text-gray-400 transition-colors"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">Add cover photo</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Title with Emoji */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Trip Name
          </label>
          <div className="flex gap-2">
            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
              >
                {tripEmoji || <Smile className="w-4 h-4 text-stone-400" />}
              </button>
              {/* Emoji Dropdown */}
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-xl shadow-lg z-10 w-72">
                  {/* Custom emoji input */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-stone-100 dark:border-gray-800">
                    <input
                      type="text"
                      placeholder="Type any emoji..."
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-stone-300"
                      onChange={(e) => {
                        // Extract first emoji from input
                        const emojiMatch = e.target.value.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F?/u);
                        if (emojiMatch) {
                          setTripEmoji(emojiMatch[0]);
                          setShowEmojiPicker(false);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        setTripEmoji(null);
                        setShowEmojiPicker(false);
                      }}
                      className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-gray-300"
                      title="Clear"
                    >
                      Clear
                    </button>
                  </div>
                  {/* Quick picks */}
                  <p className="text-[10px] text-stone-400 mb-1.5">Quick picks</p>
                  <div className="grid grid-cols-8 gap-1">
                    {TRIP_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setTripEmoji(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 dark:hover:bg-gray-800 text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 transition-all"
              placeholder="Trip name"
            />
          </div>
        </div>

        {/* Destinations */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Destinations
          </label>
          <MultiCityAutocompleteInput
            value={destinations}
            onChange={setDestinations}
            placeholder="Add cities..."
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
