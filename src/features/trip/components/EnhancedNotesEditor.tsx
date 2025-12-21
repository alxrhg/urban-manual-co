'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StickyNote,
  Check,
  X,
  Clock,
  Camera,
  ImagePlus,
  Trash2,
  Star,
  Tag,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';

interface Photo {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

interface ItemNote {
  text: string;
  duration?: number;
  photos?: Photo[];
  tags?: string[];
  rating?: number;
  isHighlight?: boolean;
  reminderNote?: string;
}

interface EnhancedNotesEditorProps {
  itemId: string;
  itemTitle: string;
  notes?: ItemNote;
  onSave: (notes: ItemNote) => void;
  onClose?: () => void;
  allowPhotoUpload?: boolean;
  className?: string;
}

const PRESET_TAGS = [
  'Must-do',
  'Romantic',
  'Family-friendly',
  'Budget',
  'Splurge',
  'Local favorite',
  'Touristy',
  'Requires reservation',
  'Walk-in only',
  'Cash only',
  'Vegetarian options',
  'Outdoor seating',
];

const DURATION_PRESETS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
];

export default function EnhancedNotesEditor({
  itemId,
  itemTitle,
  notes = { text: '' },
  onSave,
  onClose,
  allowPhotoUpload = true,
  className = '',
}: EnhancedNotesEditorProps) {
  const [editNotes, setEditNotes] = useState<ItemNote>(notes);
  const [isUploading, setIsUploading] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSave = () => {
    onSave(editNotes);
  };

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      // In a real implementation, this would upload to storage
      // For now, we'll create local URLs
      const newPhotos: Photo[] = [];

      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        newPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          uploadedAt: new Date().toISOString(),
        });
      }

      setEditNotes(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos],
      }));
    } catch (error) {
      console.error('Photo upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removePhoto = (photoId: string) => {
    setEditNotes(prev => ({
      ...prev,
      photos: (prev.photos || []).filter(p => p.id !== photoId),
    }));
  };

  const toggleTag = (tag: string) => {
    setEditNotes(prev => {
      const currentTags = prev.tags || [];
      if (currentTags.includes(tag)) {
        return { ...prev, tags: currentTags.filter(t => t !== tag) };
      }
      return { ...prev, tags: [...currentTags, tag] };
    });
  };

  const setDuration = (minutes: number) => {
    setEditNotes(prev => ({ ...prev, duration: minutes }));
    setCustomDuration('');
  };

  const handleCustomDuration = (value: string) => {
    setCustomDuration(value);
    const mins = parseInt(value, 10);
    if (!isNaN(mins) && mins > 0) {
      setEditNotes(prev => ({ ...prev, duration: mins }));
    }
  };

  const setRating = (rating: number) => {
    setEditNotes(prev => ({
      ...prev,
      rating: prev.rating === rating ? undefined : rating,
    }));
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-gray-500" />
          <span className="text-[14px] font-semibold text-gray-900 dark:text-white">
            Notes
          </span>
        </div>
        <span className="text-[12px] text-gray-400 truncate max-w-[150px]">
          {itemTitle}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Main notes text */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
            Personal notes
          </label>
          <textarea
            ref={textareaRef}
            value={editNotes.text}
            onChange={(e) => setEditNotes(prev => ({ ...prev, text: e.target.value }))}
            placeholder="Reservation tips, what to order, best time to visit..."
            className="w-full text-[13px] p-3 bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white placeholder:text-gray-400"
            rows={3}
          />
        </div>

        {/* Duration presets */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
            Time to spend
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => setDuration(preset.value)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                  editNotes.duration === preset.value
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                placeholder="Custom"
                className="w-16 px-2 py-1.5 text-[12px] bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400"
              />
              <span className="text-[11px] text-gray-400">min</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
            Your rating (after visiting)
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-colors"
              >
                <Star
                  className={`w-5 h-5 ${
                    (editNotes.rating || 0) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
            {editNotes.rating && (
              <span className="ml-2 text-[12px] text-gray-500">
                {editNotes.rating}/5
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Tags
            </label>
            <button
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showTagPicker ? 'Hide tags' : 'Add tags'}
            </button>
          </div>

          {/* Selected tags */}
          {editNotes.tags && editNotes.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {editNotes.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    className="hover:opacity-70"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag picker */}
          {showTagPicker && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {PRESET_TAGS.map(tag => {
                const isSelected = editNotes.tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-full transition-colors ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Photo gallery */}
        {allowPhotoUpload && (
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Photos & Memories
            </label>

            <div className="grid grid-cols-4 gap-2">
              {editNotes.photos?.map(photo => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 flex items-center justify-center transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Highlight toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] text-gray-700 dark:text-gray-300">
              Mark as trip highlight
            </span>
          </div>
          <button
            onClick={() => setEditNotes(prev => ({ ...prev, isHighlight: !prev.isHighlight }))}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              editNotes.isHighlight
                ? 'bg-amber-500'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                editNotes.isHighlight ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Reminder note */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Important reminder
          </label>
          <input
            type="text"
            value={editNotes.reminderNote || ''}
            onChange={(e) => setEditNotes(prev => ({ ...prev, reminderNote: e.target.value }))}
            placeholder="Arrive 10 min early, ask for Mario, etc."
            className="w-full px-3 py-2 text-[13px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-gray-900 dark:text-white placeholder:text-amber-400"
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Save notes
        </button>
      </div>
    </div>
  );
}
