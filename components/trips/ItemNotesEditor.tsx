'use client';

import { useState, useRef, useEffect } from 'react';
import { StickyNote, Check, X, Clock, Tag } from 'lucide-react';
import type { MealType } from '@/types/trip';

type ItemTag = MealType | 'stay' | '';

interface ItemNotesEditorProps {
  notes?: string;
  duration?: number; // in minutes
  mealType?: MealType;
  isHotel?: boolean;
  category?: string;
  onSave: (notes: string, duration?: number, mealType?: MealType, isHotel?: boolean) => void;
}

export default function ItemNotesEditor({
  notes = '',
  duration,
  mealType,
  isHotel,
  onSave
}: ItemNotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(notes);
  const [editDuration, setEditDuration] = useState(duration?.toString() || '');

  // Combine mealType and isHotel into a single tag
  const getInitialTag = (): ItemTag => {
    if (isHotel) return 'stay';
    if (mealType) return mealType;
    return '';
  };
  const [editTag, setEditTag] = useState<ItemTag>(getInitialTag());

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    const newMealType = editTag === 'breakfast' || editTag === 'lunch' || editTag === 'dinner' ? editTag : undefined;
    const newIsHotel = editTag === 'stay';

    onSave(
      editNotes,
      editDuration ? parseInt(editDuration, 10) : undefined,
      newMealType,
      newIsHotel
    );
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditNotes(notes);
    setEditDuration(duration?.toString() || '');
    setEditTag(getInitialTag());
    setIsEditing(false);
  };

  const getTagLabel = (tag: ItemTag): string => {
    const labels: Record<ItemTag, string> = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      stay: 'Stay',
      '': 'None',
    };
    return labels[tag];
  };

  const currentTag = getInitialTag();

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-1"
      >
        <StickyNote className="w-3 h-3" />
        {notes ? (
          <span className="truncate max-w-[150px]">{notes}</span>
        ) : (
          <span>Add note</span>
        )}
        {currentTag && (
          <>
            <span className="mx-1">·</span>
            <Tag className="w-3 h-3" />
            <span>{getTagLabel(currentTag)}</span>
          </>
        )}
        {duration && (
          <>
            <span className="mx-1">·</span>
            <Clock className="w-3 h-3" />
            <span>{formatDuration(duration)}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <textarea
        ref={textareaRef}
        value={editNotes}
        onChange={(e) => setEditNotes(e.target.value)}
        placeholder="Add a note (reservations, tips, etc.)..."
        className="w-full text-xs bg-transparent border-none resize-none focus:outline-none placeholder:text-gray-400"
        rows={2}
      />

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {/* Tag Dropdown */}
        <div className="flex items-center gap-1">
          <Tag className="w-3 h-3 text-gray-400" />
          <select
            value={editTag}
            onChange={(e) => setEditTag(e.target.value as ItemTag)}
            className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          >
            <option value="">None</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="stay">Stay</option>
          </select>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <input
            type="number"
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            placeholder="min"
            className="w-14 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="p-1 text-green-500 hover:text-green-600"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
