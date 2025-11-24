'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import TripActions from './TripActions';

interface Trip {
  name?: string;
  title?: string;
  startDate?: string;
  start_date?: string | null;
  endDate?: string;
  end_date?: string | null;
  [key: string]: any;
}

interface TripHeaderProps {
  trip: Trip;
  onOverview?: () => void;
  onEdit?: () => void;
  onTitleChange?: (newTitle: string) => void;
  canEdit?: boolean;
  className?: string;
}

export default function TripHeader({
  trip,
  onOverview,
  onEdit,
  onTitleChange,
  canEdit = false,
  className,
}: TripHeaderProps) {
  const tripName = trip.name || trip.title || 'Untitled Trip';
  const startDate = trip.startDate || trip.start_date || '';
  const endDate = trip.endDate || trip.end_date || '';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(tripName);

  // Update editedTitle when trip name changes
  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(tripName);
    }
  }, [tripName, isEditingTitle]);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== tripName && onTitleChange) {
      onTitleChange(editedTitle.trim());
    }
    setIsEditingTitle(false);
    setEditedTitle(tripName);
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle(tripName);
  };

  return (
    <header className={`pb-10 border-b border-[var(--um-border)] group ${className || ''}`}>
      <p className="text-xs tracking-widest text-[var(--um-text-muted)] mb-2 uppercase">
        TRIP
      </p>

      <div className="flex items-center gap-2 mb-1">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveTitle();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              className="text-[32px] font-[480] tracking-tight text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-900 dark:border-white focus:outline-none flex-1"
              autoFocus
            />
            <button
              onClick={handleSaveTitle}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              aria-label="Save title"
            >
              <Check className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-[32px] font-[480] tracking-tight text-gray-900 dark:text-white">
              {tripName}
            </h1>
            {canEdit && onTitleChange && (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                aria-label="Edit title"
              >
                <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </>
        )}
      </div>

      {(startDate || endDate) && (
        <p className="text-[var(--um-text-muted)] text-sm">
          {startDate} – {endDate}
        </p>
      )}

      <TripActions
        onEdit={onEdit}
        onOverview={onOverview}
      />
    </header>
  );
}

