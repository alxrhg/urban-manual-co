'use client';

import { useState, useRef, useEffect } from 'react';
import { StickyNote, Check, X, Clock } from 'lucide-react';

interface ItemNotesEditorProps {
  notes?: string;
  duration?: number; // in minutes
  onSave: (notes: string, duration?: number) => void;
}

export default function ItemNotesEditor({ notes = '', duration, onSave }: ItemNotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(notes);
  const [editDuration, setEditDuration] = useState(duration?.toString() || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editNotes, editDuration ? parseInt(editDuration, 10) : undefined);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditNotes(notes);
    setEditDuration(duration?.toString() || '');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors mt-1"
      >
        <StickyNote className="w-3 h-3" />
        {notes ? (
          <span className="truncate max-w-[150px]">{notes}</span>
        ) : (
          <span>Add note</span>
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
    <div className="mt-2 p-2 bg-stone-50 dark:bg-stone-800 rounded-lg">
      <textarea
        ref={textareaRef}
        value={editNotes}
        onChange={(e) => setEditNotes(e.target.value)}
        placeholder="Add a note (reservations, tips, etc.)..."
        className="w-full text-xs bg-transparent border-none resize-none focus:outline-none placeholder:text-stone-400"
        rows={2}
      />

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-1 flex-1">
          <Clock className="w-3 h-3 text-stone-400" />
          <input
            type="number"
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            placeholder="Duration (min)"
            className="w-20 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
          <span className="text-[10px] text-stone-400">min</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCancel}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
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
