'use client';

import { useState, useRef, useEffect } from 'react';

interface PlannerHeaderProps {
  title: string;
  destination?: string;
  dates?: string;
  onTitleChange?: (newTitle: string) => void;
}

/**
 * PlannerHeader - Lovably 'Hero' Style
 * Editorial typography with editable title
 */
export default function PlannerHeader({
  title,
  destination,
  dates,
  onTitleChange,
}: PlannerHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== title) {
      onTitleChange?.(editValue.trim());
    } else {
      setEditValue(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  // Format meta text
  const metaParts: string[] = [];
  if (destination) metaParts.push(destination);
  if (dates) metaParts.push(dates);
  const metaText = metaParts.join(' \u00b7 '); // middle dot separator

  return (
    <div className="py-8 px-6 border-b border-gray-50 dark:border-gray-900">
      {/* Meta (Destination & Dates) */}
      {metaText && (
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600 text-center mb-4">
          {metaText}
        </p>
      )}

      {/* Editable Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full text-4xl md:text-5xl font-serif text-center bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700"
          placeholder="Trip name..."
        />
      ) : (
        <h1
          onClick={() => setIsEditing(true)}
          className="text-4xl md:text-5xl font-serif text-center text-gray-900 dark:text-white cursor-text hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {title}
        </h1>
      )}
    </div>
  );
}
