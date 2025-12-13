'use client';

import { useState, useRef } from 'react';
import { Reorder } from 'framer-motion';
import { GripVertical, Plus, X, Check, CheckSquare, Square } from 'lucide-react';
import { parseTripNotes, stringifyTripNotes, type TripNoteItem } from '@/types/trip';

interface TripChecklistProps {
  notes: string;
  onSave: (notes: string) => void;
}

/**
 * TripChecklist - Trip notes with checklist functionality and drag-drop reordering
 * Displays progress bar, allows adding/removing items, and persists changes
 */
export function TripChecklist({ notes, onSave }: TripChecklistProps) {
  const parsed = parseTripNotes(notes);
  const [items, setItems] = useState<TripNoteItem[]>(parsed.items);
  const [newItemText, setNewItemText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count completed checkboxes
  const checkboxItems = items.filter(i => i.type === 'checkbox');
  const completedCount = checkboxItems.filter(i => i.checked).length;
  const totalCheckboxes = checkboxItems.length;

  // Generate unique ID
  const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Toggle checkbox
  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
    setHasChanges(true);
  };

  // Add new item
  const addItem = (type: 'checkbox' | 'text' = 'checkbox') => {
    if (!newItemText.trim()) return;
    const newItem: TripNoteItem = {
      id: generateId(),
      type,
      content: newItemText.trim(),
      ...(type === 'checkbox' ? { checked: false } : {}),
    };
    setItems(prev => [...prev, newItem]);
    setNewItemText('');
    setHasChanges(true);
    inputRef.current?.focus();
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setHasChanges(true);
  };

  // Save changes
  const handleSave = () => {
    onSave(stringifyTripNotes({ items }));
    setHasChanges(false);
  };

  // Handle key press on input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItem('checkbox');
    }
  };

  // Handle reorder
  const handleReorder = (newItems: TripNoteItem[]) => {
    setItems(newItems);
    setHasChanges(true);
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Progress indicator */}
      {totalCheckboxes > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / totalCheckboxes) * 100}%` }}
            />
          </div>
          <span className={completedCount === totalCheckboxes ? 'text-green-500' : 'text-gray-400'}>
            {completedCount}/{totalCheckboxes} done
          </span>
        </div>
      )}

      {/* Checklist items */}
      {items.length > 0 && (
        <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-1">
          {items.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                {/* Drag handle */}
                <GripVertical className="w-3 h-3 text-gray-300 dark:text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

                {/* Checkbox or text indicator */}
                {item.type === 'checkbox' ? (
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-green-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  </div>
                )}

                {/* Content */}
                <span className={`flex-1 text-sm ${
                  item.type === 'checkbox' && item.checked
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {item.content}
                </span>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Add new item */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add checklist item..."
          className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
        />
        <button
          onClick={() => addItem('checkbox')}
          disabled={!newItemText.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          className="text-xs font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white px-3 py-1.5 rounded-full flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> Save checklist
        </button>
      )}
    </div>
  );
}

export default TripChecklist;
