'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Link as LinkIcon,
  StickyNote,
  Trash2,
  GripVertical,
  ChevronRight,
  ExternalLink,
  Video,
  Image as ImageIcon,
  MapPin,
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

export interface BucketItem {
  id: string;
  type: 'link' | 'note' | 'place';
  title: string;
  url?: string;
  note?: string;
  thumbnail?: string;
  source?: 'tiktok' | 'instagram' | 'youtube' | 'web' | 'manual';
  addedAt: string;
}

interface TripBucketListProps {
  items: BucketItem[];
  onAdd: (item: Omit<BucketItem, 'id' | 'addedAt'>) => void;
  onRemove: (id: string) => void;
  onReorder: (items: BucketItem[]) => void;
  onAssignToDay: (item: BucketItem, dayNumber: number) => void;
  availableDays: number[];
  className?: string;
}

// Sortable bucket item
function SortableBucketItem({
  item,
  onRemove,
  onAssignToDay,
  availableDays,
}: {
  item: BucketItem;
  onRemove: () => void;
  onAssignToDay: (dayNumber: number) => void;
  availableDays: number[];
}) {
  const [showDayPicker, setShowDayPicker] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = () => {
    if (item.type === 'link') {
      if (item.source === 'tiktok' || item.source === 'instagram') {
        return <Video className="w-4 h-4 text-pink-500" />;
      }
      if (item.source === 'youtube') {
        return <Video className="w-4 h-4 text-red-500" />;
      }
      return <LinkIcon className="w-4 h-4 text-blue-500" />;
    }
    if (item.type === 'place') {
      return <MapPin className="w-4 h-4 text-orange-500" />;
    }
    return <StickyNote className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-xl overflow-hidden transition-all duration-200
        ${isDragging
          ? 'scale-[1.03] shadow-xl ring-2 ring-stone-900/10 dark:ring-white/20 bg-white dark:bg-gray-800 z-50 border-transparent'
          : 'bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-stone-700'}
      `}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 dark:text-gray-600 dark:hover:text-gray-400 mt-0.5"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Thumbnail or Icon */}
        {item.thumbnail ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-gray-800">
            <img src={item.thumbnail} alt={`Thumbnail for ${item.title}`} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            {getIcon()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-900 dark:text-white truncate">
            {item.title}
          </h4>
          {item.note && (
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{item.note}</p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              {item.source || 'Link'}
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowDayPicker(!showDayPicker)}
            className="p-1.5 text-stone-400 hover:text-green-500 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
            title="Add to day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day Picker */}
      {showDayPicker && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-100 dark:border-gray-800">
          <p className="text-[10px] text-stone-500 mb-2">Add to day:</p>
          <div className="flex flex-wrap gap-1">
            {availableDays.map((day) => (
              <button
                key={day}
                onClick={() => {
                  onAssignToDay(day);
                  setShowDayPicker(false);
                }}
                className="px-2 py-1 text-xs bg-stone-100 dark:bg-gray-800 hover:bg-stone-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripBucketList({
  items,
  onAdd,
  onRemove,
  onReorder,
  onAssignToDay,
  availableDays,
  className = '',
}: TripBucketListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemType, setNewItemType] = useState<'link' | 'note'>('link');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const detectSource = (url: string): BucketItem['source'] => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    return 'web';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newItemType === 'link' && newItemUrl) {
      onAdd({
        type: 'link',
        title: newItemTitle || new URL(newItemUrl).hostname,
        url: newItemUrl,
        source: detectSource(newItemUrl),
        note: newItemNote || undefined,
      });
    } else if (newItemType === 'note' && newItemTitle) {
      onAdd({
        type: 'note',
        title: newItemTitle,
        note: newItemNote || undefined,
      });
    }

    // Reset form
    setNewItemTitle('');
    setNewItemUrl('');
    setNewItemNote('');
    setIsAdding(false);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-stone-500" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Bucket List
          </h3>
          {items.length > 0 && (
            <span className="text-xs text-stone-400">({items.length})</span>
          )}
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-3 border-b border-stone-200 dark:border-gray-800 bg-stone-50 dark:bg-gray-800/50">
          {/* Type Toggle */}
          <div className="flex gap-1 mb-3">
            <button
              type="button"
              onClick={() => setNewItemType('link')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                newItemType === 'link'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-500'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Link
            </button>
            <button
              type="button"
              onClick={() => setNewItemType('note')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                newItemType === 'note'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-500'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              Note
            </button>
          </div>

          {/* URL Input (for links) */}
          {newItemType === 'link' && (
            <input
              ref={inputRef}
              type="url"
              value={newItemUrl}
              onChange={(e) => setNewItemUrl(e.target.value)}
              placeholder="Paste TikTok, Instagram, or any URL..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
          )}

          {/* Title Input */}
          <input
            ref={newItemType === 'note' ? inputRef : undefined}
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder={newItemType === 'link' ? 'Title (optional)' : 'What do you want to do?'}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />

          {/* Note Input */}
          <textarea
            value={newItemNote}
            onChange={(e) => setNewItemNote(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(newItemType === 'link' && !newItemUrl) || (newItemType === 'note' && !newItemTitle)}
              className="flex-1 px-3 py-1.5 text-xs bg-stone-900 dark:bg-white text-white dark:text-gray-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 dark:hover:bg-gray-100 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-stone-400" />
            </div>
            <p className="text-sm text-stone-500 mb-1">No items yet</p>
            <p className="text-xs text-stone-400">
              Save links, TikToks, or ideas here
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableBucketItem
                  key={item.id}
                  item={item}
                  onRemove={() => onRemove(item.id)}
                  onAssignToDay={(day) => onAssignToDay(item, day)}
                  availableDays={availableDays}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
