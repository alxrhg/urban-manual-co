'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  Check,
  Square,
  CheckSquare,
  Type,
  ListTodo,
  Trash2,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TripNoteItem, TripNotes } from '@/types/trip';

interface TripNotesEditorProps {
  notes: TripNotes;
  onChange: (notes: TripNotes) => void;
  className?: string;
}

function SortableNoteItem({
  item,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: TripNoteItem;
  onToggle: () => void;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(item.content);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 py-1.5 ${
        isDragging ? 'z-50' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-0.5 text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Checkbox or text indicator */}
      {item.type === 'checkbox' ? (
        <button
          onClick={onToggle}
          className={`mt-0.5 flex-shrink-0 transition-colors ${
            item.checked
              ? 'text-green-600 dark:text-green-500'
              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400'
          }`}
        >
          {item.checked ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ) : (
        <span className="mt-1 w-4 h-4 flex-shrink-0 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
        </span>
      )}

      {/* Content */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm bg-transparent border-b border-stone-300 dark:border-stone-600 focus:border-stone-900 dark:focus:border-white outline-none py-0.5 text-stone-900 dark:text-white"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-sm cursor-text py-0.5 ${
            item.type === 'checkbox' && item.checked
              ? 'line-through text-stone-400 dark:text-stone-500'
              : 'text-stone-700 dark:text-stone-300'
          }`}
        >
          {item.content || <span className="text-stone-400 italic">Empty item</span>}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="mt-0.5 p-0.5 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function TripNotesEditor({
  notes,
  onChange,
  className = '',
}: TripNotesEditorProps) {
  const [newItemType, setNewItemType] = useState<'text' | 'checkbox'>('checkbox');
  const [newItemValue, setNewItemValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddItem = useCallback(() => {
    if (!newItemValue.trim()) return;

    const newItem: TripNoteItem = {
      id: crypto.randomUUID(),
      type: newItemType,
      content: newItemValue.trim(),
      ...(newItemType === 'checkbox' ? { checked: false } : {}),
    };

    onChange({
      items: [...notes.items, newItem],
    });
    setNewItemValue('');
    inputRef.current?.focus();
  }, [newItemValue, newItemType, notes.items, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newItemValue.trim()) {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleToggleItem = useCallback(
    (id: string) => {
      onChange({
        items: notes.items.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        ),
      });
    },
    [notes.items, onChange]
  );

  const handleUpdateItem = useCallback(
    (id: string, content: string) => {
      onChange({
        items: notes.items.map((item) =>
          item.id === id ? { ...item, content } : item
        ),
      });
    },
    [notes.items, onChange]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      onChange({
        items: notes.items.filter((item) => item.id !== id),
      });
    },
    [notes.items, onChange]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = notes.items.findIndex((i) => i.id === active.id);
    const newIndex = notes.items.findIndex((i) => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    onChange({
      items: arrayMove(notes.items, oldIndex, newIndex),
    });
  };

  const checkedCount = notes.items.filter(
    (i) => i.type === 'checkbox' && i.checked
  ).length;
  const checkboxCount = notes.items.filter((i) => i.type === 'checkbox').length;

  return (
    <div className={`${className}`}>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-stone-900 dark:text-white">
          Notes & Lists
        </h3>
        {checkboxCount > 0 && (
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {checkedCount}/{checkboxCount} done
          </span>
        )}
      </div>

      {/* Items list */}
      {notes.items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={notes.items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5 mb-4">
              {notes.items.map((item) => (
                <SortableNoteItem
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggleItem(item.id)}
                  onUpdate={(content) => handleUpdateItem(item.id, content)}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-xs text-stone-400 dark:text-stone-500 italic mb-4">
          Add notes or checklist items for your trip...
        </p>
      )}

      {/* Add new item */}
      <div className="flex items-center gap-2">
        {/* Type toggle */}
        <div className="flex bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5">
          <button
            onClick={() => setNewItemType('checkbox')}
            className={`p-1.5 rounded-md transition-colors ${
              newItemType === 'checkbox'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
            title="Add checkbox item"
          >
            <ListTodo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setNewItemType('text')}
            className={`p-1.5 rounded-md transition-colors ${
              newItemType === 'text'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
            title="Add text note"
          >
            <Type className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              newItemType === 'checkbox' ? 'Add item...' : 'Add note...'
            }
            className="w-full text-sm px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white focus:ring-offset-1"
          />
        </div>

        {/* Add button */}
        <button
          onClick={handleAddItem}
          disabled={!newItemValue.trim()}
          className="p-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
