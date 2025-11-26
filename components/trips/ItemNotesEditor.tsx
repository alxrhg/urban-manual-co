'use client';

import { useState, useRef, useEffect } from 'react';
import { StickyNote, Check, X, Clock, UtensilsCrossed, Hotel } from 'lucide-react';
import type { MealType } from '@/types/trip';

interface ItemNotesEditorProps {
  notes?: string;
  duration?: number; // in minutes
  mealType?: MealType;
  isHotel?: boolean;
  category?: string; // destination category to show relevant options
  onSave: (notes: string, duration?: number, mealType?: MealType, isHotel?: boolean) => void;
}

export default function ItemNotesEditor({
  notes = '',
  duration,
  mealType,
  isHotel,
  category,
  onSave
}: ItemNotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(notes);
  const [editDuration, setEditDuration] = useState(duration?.toString() || '');
  const [editMealType, setEditMealType] = useState<MealType | undefined>(mealType);
  const [editIsHotel, setEditIsHotel] = useState(isHotel || false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show meal options for restaurant-like categories
  const showMealOptions = category && ['restaurant', 'cafe', 'bar', 'bakery', 'food'].some(c =>
    category.toLowerCase().includes(c)
  );
  // Show hotel options for hotel-like categories
  const showHotelOptions = category && ['hotel', 'accommodation', 'hostel', 'resort', 'lodging'].some(c =>
    category.toLowerCase().includes(c)
  );

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(
      editNotes,
      editDuration ? parseInt(editDuration, 10) : undefined,
      editMealType,
      editIsHotel
    );
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditNotes(notes);
    setEditDuration(duration?.toString() || '');
    setEditMealType(mealType);
    setEditIsHotel(isHotel || false);
    setIsEditing(false);
  };

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
        {mealType && (
          <>
            <span className="mx-1">·</span>
            <UtensilsCrossed className="w-3 h-3" />
            <span className="capitalize">{mealType}</span>
          </>
        )}
        {isHotel && (
          <>
            <span className="mx-1">·</span>
            <Hotel className="w-3 h-3" />
            <span>Stay</span>
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

      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {/* Meal Type Selector */}
        {showMealOptions && (
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-500">Meal:</span>
            <div className="flex gap-1">
              {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                <button
                  key={meal}
                  type="button"
                  onClick={() => setEditMealType(editMealType === meal ? undefined : meal)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                    editMealType === meal
                      ? meal === 'breakfast'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : meal === 'lunch'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hotel Toggle */}
        {showHotelOptions && (
          <div className="flex items-center gap-2">
            <Hotel className="w-3 h-3 text-gray-400" />
            <button
              type="button"
              onClick={() => setEditIsHotel(!editIsHotel)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                editIsHotel
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {editIsHotel ? 'Staying here tonight' : 'Mark as stay'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <input
              type="number"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value)}
              placeholder="Duration (min)"
              className="w-20 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
            <span className="text-[10px] text-gray-400">min</span>
          </div>

          <div className="flex items-center gap-1">
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
