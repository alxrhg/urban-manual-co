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
          <div className="flex-1 h-1 bg-[var(--editorial-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--editorial-accent)] transition-all duration-300"
              style={{ width: `${(completedCount / totalCheckboxes) * 100}%` }}
            />
          </div>
          <span className={completedCount === totalCheckboxes ? 'text-[var(--editorial-accent)]' : 'text-[var(--editorial-text-tertiary)]'}>
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
              <div className="flex items-start gap-2 px-2 py-1.5 bg-[var(--editorial-bg-elevated)] rounded-lg group hover:bg-[var(--editorial-border-subtle)] transition-colors">
                {/* Drag handle */}
                <GripVertical className="w-3 h-3 text-[var(--editorial-border)] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

                {/* Checkbox or text indicator */}
                {item.type === 'checkbox' ? (
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-[var(--editorial-accent)]" />
                    ) : (
                      <Square className="w-4 h-4 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]" />
                    )}
                  </button>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--editorial-text-tertiary)]" />
                  </div>
                )}

                {/* Content */}
                <span className={`flex-1 text-sm ${
                  item.type === 'checkbox' && item.checked
                    ? 'text-[var(--editorial-text-tertiary)] line-through'
                    : 'text-[var(--editorial-text-primary)]'
                }`}>
                  {item.content}
                </span>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)]" />
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
          className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
        />
        <button
          onClick={() => addItem('checkbox')}
          disabled={!newItemText.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:bg-[var(--editorial-border-subtle)] transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
        </button>
      </div>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          className="text-xs font-medium text-white bg-[var(--editorial-accent)] px-3 py-1.5 rounded-md flex items-center gap-1 hover:opacity-90 transition-opacity"
        >
          <Check className="w-3 h-3" /> Save checklist
        </button>
      )}
    </div>
  );
}

export default TripChecklist;
