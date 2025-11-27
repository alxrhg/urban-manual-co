'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';

interface TripHeroProps {
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  onTitleChange?: (title: string) => void;
  onTitleClick?: () => void;
}

/**
 * TripHero - Overlap container with hero image
 * Lovably style: grayscale image with gradient overlay
 */
export default function TripHero({
  title,
  destination,
  startDate,
  endDate,
  coverImage,
  onTitleChange,
  onTitleClick,
}: TripHeroProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  // Format dates
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  // Format subtitle
  const subtitleParts: string[] = [];
  if (destination) subtitleParts.push(destination);
  if (startDate && endDate) {
    subtitleParts.push(`${formatDate(startDate)} - ${formatDate(endDate)}`);
  } else if (startDate) {
    subtitleParts.push(formatDate(startDate));
  }
  const subtitle = subtitleParts.join(' \u2022 ');

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== title) {
      onTitleChange?.(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="relative h-[40vh] w-full overflow-hidden">
      {/* Background Image */}
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title}
          fill
          className="absolute inset-0 z-0 object-cover grayscale-[50%]"
          priority
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-white via-white/60 to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a]/60" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="max-w-2xl mx-auto">
          {subtitle && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 dark:text-gray-400 mb-3">
              {subtitle}
            </p>
          )}
          {isEditing && onTitleChange ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white leading-tight bg-transparent border-none outline-none w-full focus:ring-0"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => onTitleChange ? setIsEditing(true) : onTitleClick?.()}
              className={`
                text-4xl md:text-5xl font-serif text-gray-900 dark:text-white leading-tight
                ${onTitleChange || onTitleClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
              `}
            >
              {title}
            </h1>
          )}
        </div>
      </div>
    </div>
  );
}
