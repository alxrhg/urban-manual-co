'use client';

import { useState, useRef } from 'react';
import {
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Link,
  FileText,
  Upload,
  ExternalLink,
  Calendar,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { Trip } from '@/types/trip';

/**
 * Trip note type
 */
export interface TripNote {
  id: string;
  trip_id: string;
  title: string;
  content: string;
  isPinned: boolean;
  dayNumber?: number; // If associated with a specific day
  type: 'general' | 'day' | 'checklist';
  items?: TripNoteChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface TripNoteChecklistItem {
  id: string;
  content: string;
  checked: boolean;
}

/**
 * Trip attachment type
 */
export interface TripAttachment {
  id: string;
  trip_id: string;
  type: 'link' | 'file';
  name: string;
  url: string;
  fileType?: string; // pdf, doc, image, etc.
  created_at: string;
}

interface NotesTabProps {
  trip: Trip;
  notes: TripNote[];
  attachments: TripAttachment[];
  onAddNote: (note: Partial<TripNote>) => void;
  onUpdateNote: (id: string, updates: Partial<TripNote>) => void;
  onDeleteNote: (id: string) => void;
  onAddAttachment: (attachment: Partial<TripAttachment>) => void;
  onDeleteAttachment: (id: string) => void;
}

/**
 * NotesTab - Trip notes and documents management
 *
 * Features:
 * - Pinned notes at top
 * - Day-specific notes grouped
 * - General notes
 * - Links and file attachments
 * - Simple markdown/checklist support
 */
export default function NotesTab({
  trip,
  notes,
  attachments,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddAttachment,
  onDeleteAttachment,
}: NotesTabProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categorize notes
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const dayNotes = notes.filter((n) => !n.isPinned && n.dayNumber);
  const generalNotes = notes.filter((n) => !n.isPinned && !n.dayNumber);

  // Group day notes by day number
  const dayNotesGrouped = dayNotes.reduce((acc, note) => {
    const day = note.dayNumber || 0;
    if (!acc[day]) acc[day] = [];
    acc[day].push(note);
    return acc;
  }, {} as Record<number, TripNote[]>);

  const handleAddNote = () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;

    onAddNote({
      title: newNoteTitle.trim() || 'Untitled note',
      content: newNoteContent.trim(),
      isPinned: false,
      type: 'general',
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;

    onAddAttachment({
      type: 'link',
      name: newLinkName.trim() || newLinkUrl,
      url: newLinkUrl.trim().startsWith('http')
        ? newLinkUrl.trim()
        : `https://${newLinkUrl.trim()}`,
    });

    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real implementation, this would upload to storage
    // For now, we'll create a local URL
    const url = URL.createObjectURL(file);
    const fileType = file.name.split('.').pop() || 'file';

    onAddAttachment({
      type: 'file',
      name: file.name,
      url,
      fileType,
    });

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
        <button
          onClick={() => setIsAddingNote(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Add Note Form */}
        {isAddingNote && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <input
              type="text"
              placeholder="Note title"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-400 mb-2"
              autoFocus
            />
            <textarea
              placeholder="Write your note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none resize-none placeholder:text-gray-400"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteTitle('');
                  setNewNoteContent('');
                }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-4 uppercase">
              Pinned
            </p>
            <div className="space-y-3">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onUpdate={onUpdateNote}
                  onDelete={onDeleteNote}
                />
              ))}
            </div>
          </div>
        )}

        {/* Day Notes */}
        {Object.keys(dayNotesGrouped).length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-4 uppercase">
              Day Notes
            </p>
            <div className="space-y-3">
              {Object.entries(dayNotesGrouped)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, dayNotesList]) =>
                  dayNotesList.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={onUpdateNote}
                      onDelete={onDeleteNote}
                      showDay
                    />
                  ))
                )}
            </div>
          </div>
        )}

        {/* General Notes */}
        {generalNotes.length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-4 uppercase">
              Notes
            </p>
            <div className="space-y-3">
              {generalNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onUpdate={onUpdateNote}
                  onDelete={onDeleteNote}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Notes */}
        {notes.length === 0 && !isAddingNote && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notes yet. Add your first note above.
            </p>
          </div>
        )}

        {/* Links & Documents */}
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-4 uppercase">
            Links & Documents
          </p>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="space-y-2 mb-4">
              {attachments.map((attachment) => (
                <AttachmentItem
                  key={attachment.id}
                  attachment={attachment}
                  onDelete={() => onDeleteAttachment(attachment.id)}
                />
              ))}
            </div>
          )}

          {/* Add Link Form */}
          {isAddingLink ? (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 mb-3">
              <input
                type="text"
                placeholder="Link name (optional)"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                className="w-full text-sm text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-400 mb-2"
              />
              <input
                type="url"
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none placeholder:text-gray-400"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setIsAddingLink(false);
                    setNewLinkName('');
                    setNewLinkUrl('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLink}
                  disabled={!newLinkUrl.trim()}
                  className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddingLink(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Link className="w-4 h-4" />
                Add link
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onUpdate,
  onDelete,
  showDay = false,
}: {
  note: TripNote;
  onUpdate: (id: string, updates: Partial<TripNote>) => void;
  onDelete: (id: string) => void;
  showDay?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    onUpdate(note.id, {
      title: editTitle.trim() || 'Untitled note',
      content: editContent.trim(),
    });
    setIsEditing(false);
  };

  const toggleChecklistItem = (itemId: string) => {
    if (!note.items) return;
    const updatedItems = note.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    onUpdate(note.id, { items: updatedItems });
  };

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
      {isEditing ? (
        <div className="p-4">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-400 mb-2"
            autoFocus
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none resize-none placeholder:text-gray-400"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setEditTitle(note.title);
                setEditContent(note.content);
                setIsEditing(false);
              }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              {note.isPinned && (
                <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {note.title}
              </h3>
              {showDay && note.dayNumber && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  Day {note.dayNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })}
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {note.isPinned ? (
                  <PinOff className="w-4 h-4" />
                ) : (
                  <Pin className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            {note.type === 'checklist' && note.items ? (
              <div className="space-y-1.5">
                {note.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="flex items-start gap-2 w-full text-left"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm ${
                        item.checked
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {item.content}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {note.content}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AttachmentItem({
  attachment,
  onDelete,
}: {
  attachment: TripAttachment;
  onDelete: () => void;
}) {
  const iconClass = 'w-4 h-4 flex-shrink-0';

  const getIcon = () => {
    if (attachment.type === 'link') {
      return <Link className={`${iconClass} text-blue-500`} />;
    }
    // File type icons
    const ext = attachment.fileType?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className={`${iconClass} text-red-500`} />;
    }
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <FileText className={`${iconClass} text-purple-500`} />;
    }
    return <FileText className={`${iconClass} text-gray-500`} />;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 flex-1 min-w-0 group"
      >
        {getIcon()}
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {attachment.name}
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
